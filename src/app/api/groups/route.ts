import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import { calculateBalances } from '@/lib/settlement';

// GET /api/groups - List groups for current user with pre-calculated balances
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const groups = await repository.groups.getUserGroups(user.id);

    // Calculate the user's net balance for each group in parallel on the server
    const groupsWithBalances = await Promise.all(
      groups.map(async (group) => {
        try {
          const expenses = await repository.expenses.getByGroupId(group.id);
          const { balances } = calculateBalances(group.members, expenses);
          const userNetBalance = balances[user.id] || 0;
          return {
            ...group,
            userNetBalance,
          };
        } catch (err) {
          console.error(`Error pre-calculating balance for group ${group.id}:`, err);
          return {
            ...group,
            userNetBalance: 0,
          };
        }
      })
    );

    return NextResponse.json(groupsWithBalances);
  } catch (e) {
    console.error('Error fetching user groups:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// POST /api/groups - Create a new group
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isBonoCultural, targetDate } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio.' }, { status: 400 });
    }

    const isBono = !!isBonoCultural;
    
    // Build initial group settings
    const groupParams: any = {
      name,
      description,
      members: [user.id], // Owner is the first member
      creatorId: user.id, // Set the creator
      isBonoCultural: isBono
    };

    if (isBono) {
      groupParams.budget = 400;
      groupParams.currency = 'EUR';
      groupParams.categoryBudgets = [
        { category: 'Artes en vivo, patrimonio y audiovisual', limit: 200 },
        { category: 'Soporte físico', limit: 100 },
        { category: 'Consumo digital', limit: 100 }
      ];
      if (targetDate) {
        groupParams.targetDate = targetDate;
      }
    } else {
      if (body.budget !== undefined) groupParams.budget = body.budget;
      if (body.currency) groupParams.currency = body.currency;
      if (body.categoryBudgets) groupParams.categoryBudgets = body.categoryBudgets;
      if (targetDate) groupParams.targetDate = targetDate;
    }

    const group = await repository.groups.create(groupParams);

    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    console.error('Error creating group:', e);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

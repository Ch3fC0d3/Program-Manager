import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function findAllTasks() {
  console.log('🔍 Searching for ALL tasks in database...\n');
  
  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Get ALL tasks without any filters
    console.log('Fetching ALL tasks (no filters)...');
    const allTasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        boardId: true,
        parentId: true,
        hiddenFromMembers: true,
        createdAt: true,
        board: {
          select: {
            name: true,
            archivedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📊 Total tasks found: ${allTasks.length}\n`);

    if (allTasks.length === 0) {
      console.log('❌ No tasks found in database!\n');
    } else {
      console.log('Tasks list:');
      allTasks.forEach((task, index) => {
        console.log(`\n${index + 1}. ${task.title}`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Board: ${task.board.name}${task.board.archivedAt ? ' [ARCHIVED]' : ''}`);
        console.log(`   Parent: ${task.parentId || 'None'}`);
        console.log(`   Hidden: ${task.hiddenFromMembers}`);
        console.log(`   Created: ${task.createdAt.toISOString()}`);
      });
    }

    // Check for tasks in archived boards
    console.log('\n\n📦 Checking tasks in archived boards...');
    const archivedBoardTasks = await prisma.task.count({
      where: {
        board: {
          archivedAt: {
            not: null,
          },
        },
      },
    });
    console.log(`Tasks in archived boards: ${archivedBoardTasks}`);

    // Check for hidden tasks
    console.log('\n🔒 Checking hidden tasks...');
    const hiddenTasks = await prisma.task.count({
      where: {
        hiddenFromMembers: true,
      },
    });
    console.log(`Hidden tasks: ${hiddenTasks}`);

    // Check for subtasks
    console.log('\n👶 Checking subtasks...');
    const subtasks = await prisma.task.count({
      where: {
        parentId: {
          not: null,
        },
      },
    });
    console.log(`Subtasks: ${subtasks}`);

    // Group by board
    console.log('\n\n📋 Tasks by board:');
    const boards = await prisma.board.findMany({
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    boards.forEach(board => {
      console.log(`  - ${board.name}: ${board._count.tasks} tasks${board.archivedAt ? ' [ARCHIVED]' : ''}`);
    });

    // Check database connection details
    console.log('\n\n🔗 Database connection:');
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`  ${maskedUrl}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

findAllTasks()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

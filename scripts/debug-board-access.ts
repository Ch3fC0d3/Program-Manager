import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugBoardAccess() {
  try {
    // Find admin user
    const admin = await prisma.user.findFirst({
      where: {
        email: 'admin@example.com'
      }
    });

    if (!admin) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log('Admin User:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });

    // Get all boards admin is a member of
    const boardMemberships = await prisma.boardMember.findMany({
      where: {
        userId: admin.id
      },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            archivedAt: true
          }
        }
      }
    });

    console.log('\nBoard Memberships:', boardMemberships.length);
    boardMemberships.forEach(m => {
      console.log(`  - ${m.board.name} (${m.role})${m.board.archivedAt ? ' [ARCHIVED]' : ''}`);
    });

    // Get accessible board IDs (non-archived)
    const accessibleBoardIds = boardMemberships
      .filter(m => !m.board.archivedAt)
      .map(m => m.boardId);

    console.log('\nAccessible Board IDs:', accessibleBoardIds);

    // Count tasks in accessible boards
    const taskCount = await prisma.task.count({
      where: {
        boardId: {
          in: accessibleBoardIds
        }
      }
    });

    console.log('\nTasks in accessible boards:', taskCount);

    // Get all boards with task counts
    const allBoards = await prisma.board.findMany({
      include: {
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    console.log('\nAll Boards:');
    allBoards.forEach(b => {
      console.log(`  - ${b.name}: ${b._count.tasks} tasks${b.archivedAt ? ' [ARCHIVED]' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

debugBoardAccess();

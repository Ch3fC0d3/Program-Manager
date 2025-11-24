import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAdminToBoard() {
  try {
    // Find admin user
    const admin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@example.com' },
          { role: 'ADMIN' }
        ]
      }
    });

    if (!admin) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log('✅ Found admin user:', admin.email);

    // Find the Water & Helium Operations board
    const board = await prisma.board.findFirst({
      where: {
        name: 'Water & Helium Operations',
        archivedAt: null
      },
      include: {
        members: true
      }
    });

    if (!board) {
      console.error('❌ Water & Helium Operations board not found');
      process.exit(1);
    }

    console.log('✅ Found board:', board.name);

    // Check if admin is already a member
    const isMember = board.members.some(m => m.userId === admin.id);

    if (isMember) {
      console.log('✅ Admin is already a member of the board');
    } else {
      // Add admin as a member
      await prisma.boardMember.create({
        data: {
          boardId: board.id,
          userId: admin.id,
          role: 'ADMIN'
        }
      });

      console.log('✅ Added admin as a member of the board');
    }

    console.log('\n🎉 Done! Admin can now see all tasks.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addAdminToBoard();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Starting Database Verification...\n');
  
  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Check users
    console.log('2️⃣ Checking users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    console.log(`   Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
    console.log('');

    // Check boards
    console.log('3️⃣ Checking boards...');
    const boards = await prisma.board.findMany({
      include: {
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });
    console.log(`   Found ${boards.length} boards:`);
    boards.forEach(board => {
      console.log(`   - ${board.name} (${board._count.tasks} tasks, ${board._count.members} members)${board.archivedAt ? ' [ARCHIVED]' : ''}`);
    });
    console.log('');

    // Check tasks
    console.log('4️⃣ Checking tasks...');
    const totalTasks = await prisma.task.count();
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      _count: true,
    });
    console.log(`   Total tasks: ${totalTasks}`);
    console.log('   Tasks by status:');
    tasksByStatus.forEach(group => {
      console.log(`   - ${group.status}: ${group._count}`);
    });

    // Check for parent/child tasks
    const parentTasks = await prisma.task.count({
      where: { parentId: null },
    });
    const childTasks = await prisma.task.count({
      where: { parentId: { not: null } },
    });
    console.log(`   Parent tasks: ${parentTasks}`);
    console.log(`   Subtasks: ${childTasks}`);
    console.log('');

    // Check for hidden tasks
    console.log('5️⃣ Checking hidden tasks...');
    const hiddenTasks = await prisma.task.count({
      where: { hiddenFromMembers: true },
    });
    console.log(`   Hidden tasks: ${hiddenTasks}\n`);

    // Sample tasks
    console.log('6️⃣ Sample tasks (first 5):');
    const sampleTasks = await prisma.task.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        boardId: true,
        parentId: true,
        hiddenFromMembers: true,
        board: {
          select: {
            name: true,
          },
        },
      },
    });
    sampleTasks.forEach(task => {
      console.log(`   - [${task.status}] ${task.title}`);
      console.log(`     Board: ${task.board.name}`);
      console.log(`     Parent: ${task.parentId || 'None'}`);
      console.log(`     Hidden: ${task.hiddenFromMembers}`);
    });
    console.log('');

    // Check other entities
    console.log('7️⃣ Checking other entities...');
    const labels = await prisma.label.count();
    const comments = await prisma.comment.count();
    const attachments = await prisma.attachment.count();
    const contacts = await prisma.contact.count();
    const vendors = await prisma.vendor.count();
    const expenses = await prisma.expense.count();
    
    console.log(`   Labels: ${labels}`);
    console.log(`   Comments: ${comments}`);
    console.log(`   Attachments: ${attachments}`);
    console.log(`   Contacts: ${contacts}`);
    console.log(`   Vendors: ${vendors}`);
    console.log(`   Expenses: ${expenses}`);
    console.log('');

    // Environment check
    console.log('8️⃣ Environment configuration...');
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    const directUrl = process.env.DIRECT_URL || 'NOT SET';
    const supabaseUrl = process.env.SUPABASE_URL || 'NOT SET';
    
    // Mask passwords in URLs
    const maskUrl = (url: string) => {
      if (url === 'NOT SET') return url;
      return url.replace(/:[^:@]+@/, ':****@');
    };
    
    console.log(`   DATABASE_URL: ${maskUrl(dbUrl)}`);
    console.log(`   DIRECT_URL: ${maskUrl(directUrl)}`);
    console.log(`   SUPABASE_URL: ${supabaseUrl}`);
    console.log('');

    console.log('✅ Database verification complete!\n');

    // Summary
    if (totalTasks === 0) {
      console.log('⚠️  WARNING: No tasks found in database!');
      console.log('   You may need to run: npm run db:setup');
    } else if (totalTasks < 5) {
      console.log('⚠️  WARNING: Very few tasks found in database!');
      console.log('   Expected at least 5 demo tasks from seed data.');
    } else {
      console.log('✅ Database appears to be properly seeded!');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

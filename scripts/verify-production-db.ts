import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPECTED_PROJECT = 'iuwduqzamfjvgzlnndoh';
const EXPECTED_MIN_TASKS = 13;

async function verifyProductionDatabase() {
  console.log('🔒 PRODUCTION DATABASE VERIFICATION\n');
  
  try {
    await prisma.$connect();
    
    // Check database URL
    const dbUrl = process.env.DATABASE_URL || '';
    const isCorrectDb = dbUrl.includes(EXPECTED_PROJECT);
    
    console.log('1️⃣ Database Connection Check:');
    if (isCorrectDb) {
      console.log('   ✅ Connected to CORRECT database:', EXPECTED_PROJECT);
    } else {
      console.log('   ❌ WRONG DATABASE DETECTED!');
      console.log('   Expected:', EXPECTED_PROJECT);
      console.log('   Current:', dbUrl.replace(/:[^:@]+@/, ':****@'));
      console.log('\n   🚨 STOP! Do not proceed with deployment!');
      console.log('   See DATABASE_LOCK.md for correct configuration.\n');
      process.exit(1);
    }
    
    // Count tasks
    const taskCount = await prisma.task.count();
    
    console.log('\n2️⃣ Task Count Check:');
    if (taskCount >= EXPECTED_MIN_TASKS) {
      console.log(`   ✅ Found ${taskCount} tasks (expected minimum: ${EXPECTED_MIN_TASKS})`);
    } else {
      console.log(`   ❌ INSUFFICIENT TASKS!`);
      console.log(`   Found: ${taskCount}`);
      console.log(`   Expected minimum: ${EXPECTED_MIN_TASKS}`);
      console.log('\n   🚨 WRONG DATABASE! See DATABASE_LOCK.md\n');
      process.exit(1);
    }
    
    // Check for key tasks
    const keyTasks = [
      'Environmental Assessment',
      'Cultural assessment',
      'Grazing Permits Consents',
      'Chapter Consents',
      'Surveyor'
    ];
    
    console.log('\n3️⃣ Key Tasks Check:');
    let allFound = true;
    
    for (const taskTitle of keyTasks) {
      const task = await prisma.task.findFirst({
        where: {
          title: {
            contains: taskTitle,
            mode: 'insensitive'
          }
        }
      });
      
      if (task) {
        console.log(`   ✅ ${taskTitle}`);
      } else {
        console.log(`   ❌ MISSING: ${taskTitle}`);
        allFound = false;
      }
    }
    
    if (!allFound) {
      console.log('\n   🚨 KEY TASKS MISSING! Wrong database!\n');
      process.exit(1);
    }
    
    console.log('\n✅ ALL CHECKS PASSED!');
    console.log('✅ Safe to deploy to production.\n');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyProductionDatabase();

#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const TABLE_NAME = process.env.TABLE_NAME || 'lotg-exams-prod-quizzes';
const REGION = process.env.AWS_REGION || 'us-east-1';
const DATA_FILE = process.argv[2] || join(__dirname, '../data/sample-quizzes.json');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

/**
 * Transform quiz data to DynamoDB items
 */
function transformQuizData(quiz) {
  const items = [];
  const timestamp = new Date().toISOString();

  // Quiz metadata item
  items.push({
    PK: `QUIZ#${quiz.quizId}`,
    SK: 'METADATA',
    Type: 'Quiz',
    quizId: quiz.quizId,
    title: quiz.title,
    description: quiz.description,
    category: quiz.category,
    questionCount: quiz.questionCount,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Question items
  quiz.questions.forEach((question) => {
    items.push({
      PK: `QUIZ#${quiz.quizId}`,
      SK: `QUESTION#${question.questionId}`,
      Type: 'Question',
      quizId: quiz.quizId,
      questionId: question.questionId,
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      lawReference: question.lawReference,
    });
  });

  return items;
}

/**
 * Batch write items to DynamoDB (max 25 items per batch)
 */
async function batchWriteItems(items) {
  const batches = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  console.log(`Writing ${items.length} items in ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const params = {
      RequestItems: {
        [TABLE_NAME]: batch.map((item) => ({
          PutRequest: {
            Item: item,
          },
        })),
      },
    };

    try {
      await docClient.send(new BatchWriteCommand(params));
      console.log(`✓ Batch ${i + 1}/${batches.length} written successfully`);
    } catch (error) {
      console.error(`✗ Error writing batch ${i + 1}:`, error.message);
      throw error;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('LOTG Exams - Database Seeding Script');
    console.log('=====================================');
    console.log(`Table: ${TABLE_NAME}`);
    console.log(`Region: ${REGION}`);
    console.log(`Data file: ${DATA_FILE}\n`);

    // Read quiz data
    console.log('Reading quiz data...');
    const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    console.log(`✓ Found ${data.quizzes.length} quizzes\n`);

    // Transform all quizzes to DynamoDB items
    const allItems = [];
    data.quizzes.forEach((quiz) => {
      const items = transformQuizData(quiz);
      allItems.push(...items);
      console.log(`✓ Prepared quiz "${quiz.title}" (${items.length} items)`);
    });

    console.log(`\nTotal items to write: ${allItems.length}\n`);

    // Write to DynamoDB
    await batchWriteItems(allItems);

    console.log('\n✓ Database seeding completed successfully!');
    console.log('\nYou can now query the data:');
    console.log(`  aws dynamodb scan --table-name ${TABLE_NAME} --limit 10`);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

main();

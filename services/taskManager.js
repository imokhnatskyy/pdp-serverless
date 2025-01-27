'use strict';
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { parse, getTime, addSeconds } = require('date-fns');

const dynamo = new AWS.DynamoDB.DocumentClient();

const {
  formatAttachment,
  formatAttachmentSingleTask,
  emptyTaskList
} = require('./tasksFormatter');

const saveTask = (
  taskTitle,
  taskDescription,
  dueDate,
  userId,
  username,
) => {
  const date = getTime(
    new Date(parse(dueDate, 'yyyy-MM-dd HH:mm', new Date())),
  );

  const task = {
    taskId: uuidv4(),
    taskTitle,
    taskDescription,
    dueDate: date,
    userId,
    username,
  };

  const params = {
    TableName: process.env.TASK_DYNAMODB_TABLE,
    Item: task,
  };

  return dynamo
    .put(params)
    .promise()
    .then(() => task.taskId);
};

const deleteTask = taskId => {
  const params = {
    TableName: process.env.TASK_DYNAMODB_TABLE,
    Key: {
      taskId: taskId,
    },
  };

  return dynamo.delete(params).promise();
};

const findTaskById = taskId => {
  const params = {
    TableName: process.env.TASK_DYNAMODB_TABLE,
    Key: {
      taskId: taskId,
    },
  };

  return dynamo
    .get(params)
    .promise()
    .then(({ Item }) => formatAttachmentSingleTask(Item));
};

const getExpiringTasksIn24Hrs = () => {
  const today = Number(getTime(new Date()));
  const tomorrow = Number(getTime(new Date(addSeconds(new Date(), 86400)))); //24 hrs from now 24*60*60

  console.log('today', today);
  console.log('tomorrow', tomorrow);

  const params = {
    ExpressionAttributeNames: {
      '#dd': 'dueDate',
    },
    ExpressionAttributeValues: {
      ':tomorrow': tomorrow,
      ':today': today,
    },
    FilterExpression: '#dd between :today and :tomorrow',
    TableName: process.env.TASK_DYNAMODB_TABLE,
  };

  return dynamo
    .scan(params)
    .promise()
    .then(({ Items }) => 
      Items?.length ? formatAttachment(Items) : emptyTaskList()
    );
};

const saveTaskAndPostToSlack = (
  taskTitle,
  taskDescription,
  dueDate,
) => {
  const date = getTime(
    new Date(parse(dueDate, 'yyyy-MM-dd HH:mm', new Date())),
  );

  const task = {
    taskId: uuidv4(),
    taskTitle,
    taskDescription,
    dueDate: date,
  };

  const params = {
    TableName: process.env.TASK_DYNAMODB_TABLE,
    Item: task,
  };

  return dynamo
    .put(params)
    .promise()
    .then(() => task.taskId);
};

module.exports = {
  saveTask,
  deleteTask,
  findTaskById,
  getExpiringTasksIn24Hrs,
  saveTaskAndPostToSlack
}

import path = require('path');
import { prisma } from '../'
import * as fs from 'fs';

export const getByUsername = async (username: string) => {
    const data = await prisma.user.findFirst({
        where: {
            username
        }
    })

    return data
}

export const getUserById = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: {
            user_id: userId
        }
    })
    return user
}

export const createNewUser = async (username: string, password: string) => {
    const newUser = await prisma.user.create({
        data: {
            username,
            password
        }
    })

    return newUser
}

export const updateKey = async (userId: number, key: any) => {
    const updatedUser = await prisma.user.update({
      where: {
        user_id: userId,
      },
      data: {
        user_key: key,
      },
    });
  
    return updatedUser.user_key;
  };  

  export const createUserFolder = (userId: number) => {
    const basePath = path.resolve('data/uploads/users');
    const userFolderPath = path.join(basePath, String(userId));
  
    if (!fs.existsSync(userFolderPath)) {
      fs.mkdirSync(userFolderPath, { recursive: true });
      console.log(`Created folder: ${userFolderPath}`);
    } else {
      console.log(`Folder already exists: ${userFolderPath}`);
    }
  };
  
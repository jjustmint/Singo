import { prisma } from '../'

export const getByUsername = async (username: string) => {
    const data = await prisma.user.findFirst({
        where: {
            username
        }
    })

    return data
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

export const updateKey = async (userId: number, key: string) => {
    const updatedUser = await prisma.user.update({
      where: {
        user_id: userId,
      },
      data: {
        user_key: key,
      },
    });
  
    return updatedUser;
  };  
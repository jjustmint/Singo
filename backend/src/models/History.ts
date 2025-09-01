import { prisma } from ".."

export const FindHistoryByUserId = async(userId: number) => {
    const history = await prisma.recording.findMany({
        where:{
            user_id: userId
        },
        orderBy:{
            created_at: 'desc'
        }
    })
    return history;
}
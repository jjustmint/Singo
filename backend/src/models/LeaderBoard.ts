import { prisma } from '../'

export const findChartBoard = async(versionId: number) => {
    const chart = await prisma.recording.findMany({
        where: {
            version_id: versionId,
            accuracy_score: {
                not: null,
              },
        },
        orderBy: {
            accuracy_score: 'desc'
        },
    })
    return chart
}

export const getUserInfo = async(userId: number) => {
    const user = await prisma.user.findUnique({
        where: {
            user_id: userId
        }
    })
    return user
}
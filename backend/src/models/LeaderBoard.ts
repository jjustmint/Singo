import { prisma } from '../'

export const findChartBoard = async (versionId: number, date: Date) => {
    const chart = await prisma.recording.groupBy({
      by: ['user_id'],
      where: {
        version_id: versionId,
        accuracy_score: {
          not: null,
        },
        created_at: {
          gte: date,
        },
      },
      _max: {
        record_id: true,
        accuracy_score: true, 
        created_at: true,
      },
      orderBy: {
        _max: {
          accuracy_score: 'desc', 
        }
      }
    });
  
    return chart;
  }
  

export const getChallengeSong = async(start_date: string) => {
    const challenge = await prisma.challenge.findFirst({
        where: {
          end_date: {
            gt: new Date(start_date),
          },
        },
        orderBy: {
          start_date: 'asc',  
        },
      });
    return challenge
}

export const setChallengeSong = async (version_id: number, date: string) => {
    const setChallenge = await prisma.challenge.create({
      data: {
        version_id,
        start_date: new Date(date),
        end_date: new Date(new Date(date).setDate(new Date(date).getDate() + 6)),
      }
    })
    return setChallenge
  }

export const getUserInfo = async(userId: number) => {
    const user = await prisma.user.findUnique({
        where: {
            user_id: userId
        }
    })
    return user
}
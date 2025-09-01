import { prisma } from '../'

export const getMistake = async (recordId: number) => {
    const mistakes = await prisma.mistakes.findMany({
        where:{
            recording_id: recordId
        }
    })
    return mistakes;
}
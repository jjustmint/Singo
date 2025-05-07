const ConstructResponse = (success: boolean, msg: string, data?: any) => {
    return {
        success,
        data: data ? data : null,
        msg,
    }
}

export { ConstructResponse }
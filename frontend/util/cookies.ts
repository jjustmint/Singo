import AsyncStorage from '@react-native-async-storage/async-storage';

export const setAuthToken = async(token: string) => {
    await AsyncStorage.setItem('token', token);
}

export const getAuthToken = async() => {
    const token = await AsyncStorage.getItem('token');
    return token;
}

export const removeAuthToken = async() => {
    await AsyncStorage.removeItem("token");
}

export const setUseId = async(user_id: number) => {
    await AsyncStorage.setItem('user_id', user_id.toString());
}

export const getUserId = async() => {
    const user_id = await AsyncStorage.getItem('user_id');
    return user_id ? parseInt(user_id) : null;
}
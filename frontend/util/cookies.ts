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
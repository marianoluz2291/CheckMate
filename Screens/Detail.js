import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import React, {useEffect, useState } from 'react'
import { firebase } from '../config';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Detail = ({ route }) => {
    const { todo } = route.params;
    const [heading, setHeading] = useState(todo.heading);
    const [createdAt, setCreatedAt] = useState(todo.createdAt);
    const todoRef = firebase.firestore().collection('todos');

    const navigation = useNavigation();

    // Update todo
    const updateTodo = async () => {
        if (heading && heading.length > 0) {
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            const data = {
                heading: heading,
                createdAt: timestamp,
            };
            await todoRef.doc(todo.id).update(data).then(() => {
                setHeading('');
                navigation.goBack();
            }).catch((error) => {
                alert(error);
            });
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
            <TextInput
                style={styles.input}
                placeholder="Update todo"
                placeholderTextColor="#888"
                value={heading}
                onChangeText={(text) => setHeading(text)}
                onSubmitEditing={updateTodo}
                returnKeyType="done"
            />
            <Pressable onPress={updateTodo} style={{ marginTop: 20, padding: 15, backgroundColor: '#007bff', borderRadius: 10 }}>
                <Text style={{ color: '#fff', textAlign: 'center', fontSize: 18 }}>Update Todo</Text>
            </Pressable>
        </SafeAreaView>
    );
};

export default Detail

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#fff',
    fontSize: 18,
    color: '#333',
    shadowColor: '#000',
    overflow: 'hidden',
  },
});
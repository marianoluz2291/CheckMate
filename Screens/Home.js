import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Keyboard, Pressable } from 'react-native'
import React, { useState, useEffect } from 'react'
import { firebase } from '../config';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Home = () => {
  const [todos, setTodos] = useState([]);
  const todoRef = firebase.firestore().collection('todos');
  const [addData, setAddData] = useState('');
  const navigation = useNavigation();

  const [name, setName] = useState('');

  useEffect(() => {
    firebase.firestore().collection('users')
    .doc(firebase.auth().currentUser.uid).get()
    .then((snapshot) => {
        if (snapshot.exists) {
            setName(snapshot.data());
        } else {
            console.log('User does not exist');
        }
    })
  }, []);

  // fetch todos from firestore
  useEffect(() => {
    todoRef.orderBy('createdAt', 'desc').onSnapshot((querySnapshot) => {
      const todos = [];
      querySnapshot.forEach((doc) => {
        todos.push({ id: doc.id, ...doc.data() });
      });
      setTodos(todos);
    });
  }, []);

  // Delete a todo
  const deleteTodo = async (todos) => {
    await todoRef.doc(todos.id).delete().then(() => {
      alert("Deleted Successfully")
    }).catch((error) => {
      alert(error);
    });
  };

  // Add a todo
  const addTodo = async () => {
    if(addData && addData.length > 0) {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const data = {
          heading: addData,
          createdAt: timestamp,
        };
        await todoRef.add(data).then(() => {
          setAddData('');
          Keyboard.dismiss();
        }).catch((error) => {
          alert(error);
        });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Welcome, {name.firstName}!</Text>
      <TextInput
        style={styles.input}
        placeholder="Add a new todo"
        placeholderTextColor="#888"
        value={addData}
        onChangeText={(heading) => setAddData(heading)}
        onSubmitEditing={addTodo}
        returnKeyType="done"
        autoCapitalize="none"
        autoCorrect={false}
        enablesReturnKeyAutomatically={true}
        underlineColorAndroid="transparent"
      />
      <TouchableOpacity style={styles.addButton} onPress={addTodo}>
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('Detail', { todo: item })}>
                <View style={styles.todoItem}>
                    <Text style={styles.todoText}>{item.heading}</Text>
                    <TouchableOpacity onPress={() => deleteTodo(item)}>
                        <FontAwesome name="trash-o" size={20} color="#ff0000" />
                    </TouchableOpacity>
                </View>
            </Pressable>
        )}
      />
      <TouchableOpacity style={{ marginBottom: 20 }} onPress={() => firebase.auth().signOut()}>
        <Text style={{ color: '#ff0000', textAlign: 'center' }}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    margin: 5,
    marginHorizontal: 10,
  },
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
  addButton: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoItem: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
  },
  todoText: {
    fontSize: 18,
  },
});
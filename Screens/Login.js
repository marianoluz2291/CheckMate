import { View, Text, TouchableOpacity, TextInput, StyleSheet, AppState } from 'react-native'
import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native';
import { firebase } from '../config';
import { SafeAreaView } from 'react-native-safe-area-context';

AppState.addEventListener('change', state => {
  if (state === 'active') {
    firebase.auth().currentUser.reload();
  }
});

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  loginUser = async () => {
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password)
    }catch (error) {
        alert(error.message);
    }
  };

  return (
    <SafeAreaView>
      <Text style={styles.title}>Login</Text>
        <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={(email) => setEmail(email)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
        />
        <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={(password) => setPassword(password)}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
        />
        <TouchableOpacity style={styles.button} onPress={loginUser}>
            <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.navigate('Registration')}>
            <Text style={{ color: '#007bff', textAlign: 'center' }}>Don't have an account? Register</Text>
        </TouchableOpacity>
    </SafeAreaView>
  )
}

export default Login

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
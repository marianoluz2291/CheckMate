import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import React, { useState } from 'react'
import { firebase } from '../config'
import { SafeAreaView } from 'react-native-safe-area-context'

const Registration = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const registerUser = async (email, password, firstName, lastName) => {
      await firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(() => {
        firebase.auth().currentUser.sendEmailVerification({
            handleCodeInApp: true,
            url: 'https://checkmate-141f1.firebaseapp.com'
        })
        .then(() => {
            alert('Verification email sent. Please check your inbox.')
        }).catch((error) => {
            console.error('Error sending email verification:', error)
        })
        .then(() => {
            firebase.firestore().collection('users')
            .doc(firebase.auth().currentUser.uid)
            .set({
                firstName,
                lastName,
                email,
            })
        })
        .catch((error) => {
            console.error('Error adding user to Firestore:', error)
        })
    })
    .catch((error) => {
        alert(error.message)
    })
  }

  const handleRegister = () => {
      registerUser(email, password, firstName, lastName)
  }

  return (
    <SafeAreaView>
      <Text style={styles.title}>Registration</Text>
      <TextInput
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
      />
      <TextInput
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={handleRegister} style={styles.button}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: 'blue',
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
})

export default Registration
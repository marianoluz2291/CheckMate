import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Image, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { firebase } from '../config';
import { ThemeContext, themeColors, getTheme, useTheme } from '../functions/ThemeContext';

const Profile = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    fetchUserProfile()
  }, []);

  const fetchUserProfile = async () => {
    try {
      // Get current user
      const user = firebase.auth().currentUser;

      if (!user) {
        navigation.replace('Auth');
        return;
      }

      setEmail(user.email);

      // Fetch user profile data
      const displayName = user.displayName;
      const photoURL = user.photoURL;

      if (user) {
        setUsername(displayName || '');
        setNewUsername(displayName || '');

        // Validate avatar URL before setting
        if (photoURL) {
          await validateImageUrl(photoURL);
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

  // Validate if image URL is accessible
  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        setAvatarUrl(url);
        setImageLoadError(false);
      } else {
        console.warn('Image URL not accessible:', response.status);
        setImageLoadError(true);
        await handleBrokenImage();
      }
    } catch (error) {
      console.warn('Error validating image URL:', error);
      setImageLoadError(true);
      await handleBrokenImage();
    }
  };

  // Handle broken/inaccessible images
  const handleBrokenImage = async () => {
    try {
      const user = firebase.auth().currentUser;
      if (user) {
        // Clear the broken avatar_url from database
        await user.updateProfile({
          photoURL: null
        });
      }
      setAvatarUrl('');
    } catch (error) {
      console.error('Error clearing broken avatar URL:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const user = firebase.auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to update your profile');
        return;
      }
      await user.updateProfile({
        displayName: newUsername,
      });
        setUsername(newUsername);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.log(error.message);
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      // Check if ImagePicker is available
      if (!ImagePicker.launchImageLibraryAsync) {
        Alert.alert('Error', 'Image picker is not available on this device');
        return;
      }

      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      // Show action sheet for image source selection
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          { text: 'Camera', onPress: () => openCamera() },
          { text: 'Photo Library', onPress: () => openImageLibrary() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error in pickImage:', error);
      Alert.alert('Error', 'Failed to access image picker. Please try again.');
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open image library. Please check your device permissions and try again.');
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploadingImage(true);

      const user = firebase.auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to upload images');
        return;
      }

      // Validate the image URI
      if (!uri) {
        throw new Error('Invalid image URI');
      }

      // Delete old avatar if exists
      if (avatarUrl) {
        try {
          await user.updateProfile({
            photoURL: null
          });
        } catch (error) {
          console.warn('Could not delete old avatar:', error);
        }
      }

      // Validate file before upload
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Could not access the selected image');
      }
      const blob = await response.blob();
      // Validate blob size (max 5MB)
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Image is too large. Please select an image smaller than 5MB.');
      }
      // Validate MIME type
      if (!blob.type.startsWith('image/')) {
        throw new Error('Selected file is not a valid image');
      }
      const fileExtension = blob.type.split('/')[1] || 'jpg';

      // Upload to Firestore with retry logic
      let uploadAttempts = 0;
      const maxAttempts = 3;
      let uploadError;

      while (uploadAttempts < maxAttempts) {
        try {
          await user.updateProfile({
            photoURL: fileExtension
          });

          // Success - break out of retry loop
          uploadError = null;
          break;
        } catch (error) {
          uploadError = error;
          uploadAttempts++;

          if (uploadAttempts < maxAttempts) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempts));
          }
        }
      }

      if (uploadError) {
        throw new Error(`Upload failed after ${maxAttempts} attempts: ${uploadError.message}`);
      }

      // Get public URL
      const publicUrl = user.photoURL;

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      // Validate the uploaded image URL
      const validateResponse = await fetch(publicUrl, { method: 'HEAD' });
      if (!validateResponse.ok) {
        throw new Error('Uploaded image is not accessible');
      }
      console.log('Uploaded image URL:', publicUrl);
      // Update profile with new avatar URL
      await user.updateProfile({
        photoURL: publicUrl
      });
      // Update local state
      setAvatarUrl(publicUrl);
      setImageLoadError(false);
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to upload image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageError = (error) => {
    console.error('Image load error:', error);
    setImageLoadError(true);
    setAvatarUrl('');
    // Optionally clear from database
    handleBrokenImage();
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete Account",
          style: "destructive",
          // Prompt for password before deletion
          onPress: () => {
            Alert.prompt(
              'Enter Password',
              'Please enter your password to proceed.',
              [
                {
                text: 'Cancel',
                onPress: () => console.log('Password prompt cancelled'),
                style: 'cancel',
              },
              {
                text: 'OK',
                onPress: async (password) => {
                  try {
                    setDeleting(true);
                    const user = firebase.auth().currentUser;

                    if (!user) {
                      Alert.alert('Error', 'You must be logged in to delete your account');
                      return;
                    }
                    // Delete avatar from storage if exists
                    if (avatarUrl) {
                      try {
                        await user.updateProfile({
                          photoURL: null
                        });
                      } catch (error) {
                        console.warn('Could not delete avatar from storage:', error);
                      }
                    }
                    await user.reauthenticateWithCredential(
                      firebase.auth.EmailAuthProvider.credential(user.email, password)
                    );
                    await user.delete();
                    Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
                  } catch (error) {
                    console.error('Error deleting account:', error.message);
                    Alert.alert('Error', 'Failed to delete account. Please try again later.');
                  } finally {
                    setDeleting(false);
                  }
                },
              }],
              'secure-text' // This type ensures the input is hidden
            );
          }
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        <View style={styles.placeholder} />
      </SafeAreaView>

      <View style={[styles.profileSection, { backgroundColor: theme.colors.card }]}>
        <View style={styles.profileImageContainer}>
          <TouchableOpacity 
            style={[styles.profileImage, { backgroundColor: theme.colors.primary }]}
            onPress={pickImage}
            disabled={uploadingImage}
          >
            {avatarUrl && !imageLoadError ? (
              <Image 
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                onError={handleImageError}
                onLoad={() => {
                  console.log('Image loaded successfully');
                  setImageLoadError(false);
                }}
              />
            ) : (
              <Text style={styles.profileInitial}>
                {username.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editImageButton}
            onPress={pickImage}
            disabled={uploadingImage}
          >
            <Feather name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          {isEditing ? (
            <TextInput
              style={[styles.usernameInput, {
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter username"
              placeholderTextColor={theme.colors.secondaryText}
            />
          ) : (
            <Text style={[styles.profileName, { color: theme.colors.text }]}>
              {username}
            </Text>
          )}
          <Text style={[styles.profileEmail, { color: theme.colors.secondaryText }]}>
            {email}
          </Text>
        </View>

        {isEditing ? (
          <View style={styles.editButtonsContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.secondary }]}
              onPress={() => {
                setNewUsername(username);
                setIsEditing(false);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setIsEditing(true)}
          >
            <Feather name="edit-2" size={16} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.settingsSection, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <View style={styles.settingIconContainer}>
            <Feather name="lock" size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.settingText, { color: theme.colors.text }]}>Change Password</Text>
          <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.deleteAccountButton, { backgroundColor: '#FF3B30' }]}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Feather name="trash-2" size={20} color="#FFFFFF" />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#555',
    borderRadius: 20,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  usernameInput: {
    fontSize: 18,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    width: 200,
    textAlign: 'center',
    marginBottom: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '600',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    margin: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  settingsSection: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  deleteAccountText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default Profile;
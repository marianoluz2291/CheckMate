import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import { firebase } from '../config';
import * as ImagePicker from 'expo-image-picker';

const CreateTask = ({ navigation, route }) => {
  const { theme } = useContext(ThemeContext);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState(null);

  // Date picker state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    const getCurrentUser = async () => {
      const user = firebase.auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        navigation.navigate('Login');
        return;
      }
      setUserId(user.uid);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    (async () => {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera and media library access is needed to attach photos to tasks.');
      }
    })();
  }, []);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'User is not authenticated');
      return;
    }
    createTask();
  };

  const createTask = async () => {
    try {
      // Start with basic task data
      const taskData = {
        title,
        description,
        is_completed: false,
        due_date: dueDate,
        due_status: dueDate ? dueDate < new Date() : false,
        user_id: userId,
      };
      // If there's a photo, upload it first
      if (photo) {
        const photoUrl = await uploadPhoto(photo);
        if (photoUrl) {
          taskData.photo_url = photoUrl;
        }
      }
      // Insert the task data
      const { data, error } = await firebase.firestore()
        .collection('tasks')
        .add(taskData);
      if (error) {
        console.error('Error creating task:', error);
        Alert.alert('Error', 'Failed to create task: ' + error.message);
      } else {
        Alert.alert('Success', 'Task created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Task creation failed:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const uploadPhoto = async (photoUri) => {
    if (!photoUri) return null;
    try {
      setUploading(true);
      console.log('Skipping actual upload in development, using local URI for testing');
      return photoUri;
    } catch (error) {
      console.error('Error in photo upload:', error);
      Alert.alert('Error', 'Photo upload skipped in development mode');
      return photoUri; 
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const removePhoto = () => {
    setPhoto(null);
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (day) => {
    const newDate = new Date(selectedYear, selectedMonth, day);
    setDueDate(newDate);
    setShowDatePicker(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
    // Initialize with current date if none selected
    if (!dueDate) {
      const today = new Date();
      setSelectedYear(today.getFullYear());
      setSelectedMonth(today.getMonth());
    } else {
      setSelectedYear(dueDate.getFullYear());
      setSelectedMonth(dueDate.getMonth());
    }
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Attach Photo', 
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Task</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleCreateTask} disabled={uploading}>
          <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
            {uploading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.formSection, { backgroundColor: theme.colors.card }]}>
        {/* Task Title */}
        <View style={styles.inputContainer}>
          <Feather name="file-text" size={20} color={theme.colors.primary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="Task title"
            placeholderTextColor={theme.colors.secondaryText}
            autoFocus={true}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputContainer}>
          <Feather name="align-left" size={20} color={theme.colors.primary} style={styles.inputIcon} />
          <TextInput 
            style={[styles.input, styles.descriptionInput, { color: theme.colors.text }]}
            placeholder="Description"
            placeholderTextColor={theme.colors.secondaryText}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Due Date */}
        <TouchableOpacity style={styles.selectorContainer} onPress={openDatePicker}>
          <Feather name="calendar" size={20} color={theme.colors.primary} style={styles.inputIcon} />
          <Text style={[styles.selectorText, { color: dueDate ? theme.colors.text : theme.colors.secondaryText }]}>
            {dueDate ? formatDate(dueDate) : 'Add due date'}
          </Text>
          <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>

        {/* Photo Attachment */}
        <TouchableOpacity
          style={styles.selectorContainer}
          onPress={photo ? removePhoto : showImageOptions}
        >
          <Feather
            name={photo ? "image" : "camera"}
            size={20}
            color={theme.colors.primary}
            style={styles.inputIcon}
          />
          <Text style={[styles.selectorText, { color: photo ? theme.colors.text : theme.colors.secondaryText }]}>
            {photo ? 'Photo attached' : 'Attach photo'}
          </Text>
          {photo ? (
            <TouchableOpacity onPress={removePhoto}>
              <Feather name="x" size={20} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          ) : (
            <Feather name="chevron-right" size={20} color={theme.colors.secondaryText} />
          )}
        </TouchableOpacity>

        {/* Photo Preview */}
        {photo && (
          <View style={styles.photoPreviewContainer}>
            <Image
              source={{ uri: photo }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionButton} onPress={showImageOptions}>
                <Feather name="edit-2" size={16} color={theme.colors.primary} />
                <Text style={[styles.photoActionText, { color: theme.colors.primary }]}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionButton} onPress={removePhoto}>
                <Feather name="trash-2" size={16} color="#FF3B30" />
                <Text style={[styles.photoActionText, { color: "#FF3B30" }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.createButton,
          { backgroundColor: theme.colors.primary },
          uploading && { opacity: 0.7 }
        ]}
        onPress={handleCreateTask}
        disabled={uploading}
      >
        <Text style={styles.createButtonText}>
          {uploading ? 'Creating...' : 'Create Task'}
        </Text>
      </TouchableOpacity>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View
            style={[styles.datePickerContainer, { backgroundColor: theme.colors.card }]}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(evt) => evt.stopPropagation()}
          >
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={goToPreviousMonth}>
                <Feather name="chevron-left" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.datePickerTitle, { color: theme.colors.text }]}>
                {months[selectedMonth]} {selectedYear}
              </Text>
              <TouchableOpacity onPress={goToNextMonth}>
                <Feather name="chevron-right" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekdaysContainer}>
              {daysOfWeek.map(day => (
                <Text key={day} style={[styles.weekdayLabel, { color: theme.colors.secondaryText }]}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {/* Empty cells for days before the first day of month */}
              {Array.from({ length: getFirstDayOfMonth(selectedMonth, selectedYear) }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.dayCell} />
              ))}

              {/* Days of the month */}
              {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }).map((_, index) => {
                const day = index + 1;
                const currentDate = new Date(selectedYear, selectedMonth, day);
                const isSelected = dueDate && 
                  dueDate.getDate() === day && 
                  dueDate.getMonth() === selectedMonth &&
                  dueDate.getFullYear() === selectedYear;

                const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      isSelected && styles.selectedDayCell,
                      isSelected && { backgroundColor: theme.colors.primary },
                      isWeekend && styles.weekendDayCell
                    ]}
                    onPress={() => handleDateSelect(day)}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: theme.colors.text },
                      isSelected && styles.selectedDayText,
                      isWeekend && styles.weekendDayText
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.clearDateButton, { borderColor: theme.colors.primary }]}
              onPress={() => {
                setDueDate(null);
                setShowDatePicker(false);
              }}
            >
              <Text style={[styles.clearDateText, { color: theme.colors.primary }]}>
                Clear Date
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formSection: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 16,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  photoPreviewContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  photoActionText: {
    marginLeft: 8,
    fontSize: 14,
  },
  createButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    width: '90%',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 8,
    position: 'relative',
  },
  selectedDayCell: {
    backgroundColor: '#007AFF',
  },
  weekendDayCell: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  weekendDayText: {
    color: '#42A5F5',
  },
  clearDateButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    alignSelf: 'center',
  },
  clearDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CreateTask;
import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ThemeContext } from '../functions/ThemeContext';
import { firebase } from '../config';
import * as ImagePicker from 'expo-image-picker';
import PomodoroTimer from '../screens/PomodoroTimer';

export default function TaskDetail({ route, navigation }) {
  const { taskId } = route.params;
  const { theme, isDarkMode } = useContext(ThemeContext);

  const [task, setTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedTask, setUpdatedTask] = useState({
    title: '',
    description: '',
    is_completed: false,
    photo_url: null,
    completed_time: null
  });
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, []);

  // Reset image error state when image URL changes
  useEffect(() => {
    setImageError(false);
  }, [updatedTask.photo_url]);

  const handlePomodoroComplete = (taskId, wasWorkSession) =>{
    if (wasWorkSession){
      console.log('Pomodoro completed for task:', taskId);
    }
  };

  const fetchTaskDetails = async () => {
    try {
      await firebase.firestore()
        .collection('tasks')
        .doc(taskId)
        .get()
        .then(querySnapshot => {
          const data = querySnapshot.data();
          setTask(data);
          setUpdatedTask({
            title: data.title || '',
            description: data.description || '',
            is_completed: data.is_completed || false,
            photo_url: data.photo_url || null,
            completed_time: data.completed_time || null
          });
        })
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleSave = async () => {
    try {
      await firebase.firestore()
        .collection('tasks')
        .doc(taskId)
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          is_completed: updatedTask.is_completed,
          photo_url: updatedTask.photo_url,
          completed_time: updatedTask.completed_time
        });

        setTask({
          ...task,
          title: updatedTask.title,
          description: updatedTask.description,
          is_completed: updatedTask.is_completed,
          photo_url: updatedTask.photo_url,
          completed_time: updatedTask.completed_time
        });
        setIsEditing(false);
        Alert.alert('Success', 'Task updated successfully');
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const toggleComplete = async () => {
    try {
      const newStatus = !updatedTask.is_completed;
      // Format the time correctly
      let completedTime = null;
      if (newStatus) {
        const now = new Date();
        completedTime = now.toTimeString().split(' ')[0] + now.toTimeString().match(/GMT[+-]\d{4}/)[0].replace('GMT', '');
      }
      await firebase.firestore()
        .collection('tasks')
        .doc(taskId)
        .update({
          is_completed: newStatus,
          completed_time: completedTime
        });
        setTask({ ...task, is_completed: newStatus, completed_time: completedTime });
        setUpdatedTask({ ...updatedTask, is_completed: newStatus, completed_time: completedTime });
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const deleteTask = async () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebase.firestore()
                .collection('tasks')
                .doc(taskId)
                .delete();
                Alert.alert('Success', 'Task deleted successfully');
                navigation.goBack();
            } catch (error) {
              console.error('Unexpected error:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to add images!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;

      // Reset error state when selecting a new image
      setImageError(false);
      setUpdatedTask({ ...updatedTask, photo_url: imageUri });

      if (!isEditing) {
        // If not in edit mode, update immediately
        try {
          await firebase.firestore()
            .collection('tasks')
            .doc(taskId)
            .update({ photo_url: imageUri });
            setTask({ ...task, photo_url: imageUri });
        } catch (error) {
          console.error('Unexpected error:', error);
          Alert.alert('Error', 'An unexpected error occurred');
        }
      }
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUpdatedTask({ ...updatedTask, photo_url: null });
            if (!isEditing) {
              try {
                await firebase.firestore()
                  .collection('tasks')
                  .doc(taskId)
                  .update({ photo_url: null });
                  setTask({ ...task, photo_url: null });
              } catch (error) {
                console.error('Unexpected error:', error);
                Alert.alert('Error', 'An unexpected error occurred');
              }
            }
          }
        }
      ]
    );
  };

  // Helper function to format date for display
  const formatDateTime = (isoString) => {
    if (!isoString) return 'Not completed yet';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Add this function to handle task updates from pomodoro
  const handleTaskUpdate = (taskId, updates) => {
    setTask(prevTask => ({
      ...prevTask,
      ...updates
    }));
    setUpdatedTask(prevTask => ({
      ...prevTask,
      ...updates
    }));
  };

  const renderTaskImage = () => {
    if (updatedTask.photo_url) {
      return (
        <View style={styles.taskImageContainer}>
          <TouchableOpacity
            onPress={pickImage}
            activeOpacity={0.8}
            accessibilityLabel="Task image, tap to change"
          >
            <Image
              source={{ uri: updatedTask.photo_url }}
              style={styles.taskImage}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
                console.error('Error loading image:', updatedTask.photo_url);
              }}
            />
          </TouchableOpacity>

          {/* Show loading indicator while image loads */}
          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}

          {/* Show error indicator if image fails to load */}
          {imageError && (
            <View style={styles.imageErrorOverlay}>
              <MaterialIcons name="broken-image" size={40} color={theme.colors.error} />
              <Text style={[styles.imageErrorText, { color: theme.colors.error }]}>
                Failed to load image
              </Text>
            </View>
          )}

          {/* Image controls */}
          <View style={styles.imageControls}>
            <TouchableOpacity 
              style={[styles.imageControlButton, { backgroundColor: theme.colors.primary }]}
              onPress={pickImage}
              accessibilityLabel="Change image"
            >
              <Feather name="edit-2" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imageControlButton, { backgroundColor: theme.colors.error }]}
              onPress={removeImage}
              accessibilityLabel="Remove image"
            >
              <Feather name="trash-2" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      // Render category icon as fallback
      const iconName = 'tasks';
      const backgroundColor = '#808080';

      return (
        <TouchableOpacity 
          style={[styles.taskIconContainer, { backgroundColor }]}
          onPress={pickImage}
          accessibilityLabel={`Add image to task: ${updatedTask.title}`}
        >
          <FontAwesome5 name={iconName} size={36} color="white" />
          <Text style={styles.addImageText}>Add Image</Text>
        </TouchableOpacity>
      );
    }
  };

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>Task not found</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Task Details
        </Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          accessibilityLabel={isEditing ? "Save changes" : "Edit task"}
        >
          <Feather
            name={isEditing ? "check" : "edit-2"}
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Task Image or Icon */}
          <View style={styles.imageContainer}>
            {renderTaskImage()}
          </View>

          {/* Task Title */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>
              Title
            </Text>
            {isEditing ? (
              <TextInput
                style={[styles.editableText, {
                  color: theme.colors.text,
                  borderBottomColor: theme.colors.primary
                }]}
                value={updatedTask.title}
                onChangeText={(text) => setUpdatedTask({ ...updatedTask, title: text })}
                placeholder="Task title"
                placeholderTextColor={theme.colors.placeholderText}
              />
            ) : (
              <Text style={[styles.taskTitle, { color: theme.colors.text }]}>
                {task.title}
              </Text>
            )}
          </View>

          {/* Task Status */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText }]}>
              Status
            </Text>
            <TouchableOpacity
              style={styles.statusContainer}
              onPress={toggleComplete}
            >
              <MaterialIcons
                name={updatedTask.is_completed ? "check-circle" : "radio-button-unchecked"}
                size={24}
                color={updatedTask.is_completed ? theme.colors.success : theme.colors.primary}
              />
              <Text style={[styles.statusText, {
                color: updatedTask.is_completed ? theme.colors.success : theme.colors.primary,
                marginLeft: 10
              }]}>
                {updatedTask.is_completed ? "Completed" : "Not Completed"}
              </Text>
            </TouchableOpacity>

            {/* Completion Time - show only if task is completed */}
            {updatedTask.is_completed && updatedTask.completed_time && (
              <View style={styles.completionTimeContainer}>
                <Text style={[styles.completionTimeLabel, { color: theme.colors.secondaryText }]}>
                  Completed on:
                </Text>
                <Text style={[styles.completionTimeValue, { color: theme.colors.text }]}>
                  {formatDateTime(updatedTask.completed_time)}
                </Text>
              </View>
            )}
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
            onPress={deleteTask}
          >
            <Feather name="trash-2" size={20} color="white" />
            <Text style={styles.deleteButtonText}>Delete Task</Text>
          </TouchableOpacity>
          {/* Pomodoro Timer Section */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.pomodoroHeader}
              onPress={() => setShowPomodoro(!showPomodoro)}
              activeOpacity={0.7}
            >
              <View style={styles.pomodoroHeaderLeft}>
                <MaterialIcons
                  name="timer"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.sectionTitle, { color: theme.colors.secondaryText, marginBottom: 0, marginLeft: 8 }]}>
                  Focus Timer
                </Text>
              </View>

              <View style={styles.pomodoroHeaderRight}>
                {task.pomodoros > 0 && (
                  <Text style={[styles.pomodoroSummary, { color: theme.colors.primary }]}>
                    🍅 {task.pomodoros} completed
                  </Text>
                )}
                <MaterialIcons
                  name={showPomodoro ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
            </TouchableOpacity>

            {showPomodoro && (
              <View style={[styles.pomodoroContainer, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border
              }]}>
                <PomodoroTimer
                  task={{
                    id: task.id,
                    title: task.title,
                    pomodoros: task.pomodoros || 0
                  }}
                  onPomodoroComplete={handlePomodoroComplete}
                  onUpdateTask={handleTaskUpdate}
                  theme={theme}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  actionButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  button: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  taskImageContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
  },
  taskImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 12,
  },
  imageControls: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    padding: 4,
  },
  imageControlButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  taskIconContainer: {
    width: 150,
    height: 150,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: 'white',
    marginTop: 8,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editableText: {
    fontSize: 18,
    padding: 10,
    borderBottomWidth: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  completionTimeContainer: {
    marginTop: 10,
    paddingLeft: 34,
  },
  completionTimeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  completionTimeValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pomodoroHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 4,
  },
  pomodoroHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pomodoroHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pomodoroSummary: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  pomodoroContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  }
});
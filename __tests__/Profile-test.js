import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Profile from '../screens/Profile';
import { ThemeContext } from '../functions/ThemeContext';
import { firebase } from '../config';
import * as ImagePicker from 'expo-image-picker';

// Mock Firebase
jest.mock('../config', () => ({
  firebase: {
    auth: jest.fn(() => ({
      currentUser: {
        uid: 'test-user-id',
        email: 'testuser@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.jpg',
        updateProfile: jest.fn().mockResolvedValue(),
        reauthenticateWithCredential: jest.fn().mockResolvedValue(),
        delete: jest.fn().mockResolvedValue(),
      },
    })),
  },
}));

  it('renders the profile screen correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <ThemeContext.Provider value={{ theme: mockTheme }}>
        <Profile navigation={mockNavigation} />
      </ThemeContext.Provider>
    );

    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Test User')).toBeTruthy();
    expect(getByText('testuser@example.com')).toBeTruthy();
    expect(getByText('Edit Profile')).toBeTruthy();
    expect(getByText('Change Password')).toBeTruthy();
    expect(getByText('Delete Account')).toBeTruthy();
  });

  mockTheme = {
    colors: {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#007AFF',
      card: '#F8F8F8',
      secondaryText: '#A9A9A9',
      border: '#CCCCCC',
    },
  };

  mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };

  it('navigates to change password screen', () => {
    const { getByText } = render(
      <ThemeContext.Provider value={{ theme: mockTheme }}>
        <Profile navigation={mockNavigation} />
      </ThemeContext.Provider>
    );

    const changePasswordButton = getByText('Change Password');
    fireEvent.press(changePasswordButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ChangePassword');
  });
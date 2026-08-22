import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail, Phone, MapPin, Shield, Calendar,
  Droplets, HeartPulse, Save, Edit2
} from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  const handleSave = async () => {
    // In a real app, you would update the profile here
    setIsEditing(false);
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'doctor': return 'bg-blue-100 text-blue-800';
      case 'nurse': return 'bg-green-100 text-green-800';
      case 'patient': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 tracking-tight">My Profile</h1>
        <p className="text-gray-500">View and manage your account information</p>
      </div>

      {/* Profile Header */}
      <div className="card">
        <div className="flex items-center space-x-6">
          <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-700 font-bold text-3xl">
              {user?.full_name?.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{user?.full_name}</h2>
            <p className="text-gray-500">@{user?.username}</p>
            <div className="mt-2 flex items-center space-x-3">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${getRoleColor()}`}>
                {user?.role}
              </span>
              <span className="text-sm text-gray-500">ID: #{user?.id}</span>
            </div>
          </div>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={isEditing ? 'btn-success' : 'btn-secondary'}
          >
            {isEditing ? (
              <><Save className="h-4 w-4 mr-2 inline" /> Save</>
            ) : (
              <><Edit2 className="h-4 w-4 mr-2 inline" /> Edit</>
            )}
          </button>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{user?.email}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Phone</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{user?.phone || 'Not provided'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Address</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{user?.address || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Information</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-900 capitalize">{user?.role}</p>
              </div>
            </div>
            {user?.role === 'patient' && (
              <>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-medium text-gray-900">{user?.date_of_birth || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <HeartPulse className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Blood Type</p>
                    <p className="font-medium text-gray-900">{user?.blood_type || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Droplets className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Access Type</p>
                    <p className="font-medium text-gray-900">{user?.access_type || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Dialysis Start Date</p>
                    <p className="font-medium text-gray-900">{user?.dialysis_start_date || 'Not provided'}</p>
                  </div>
                </div>
              </>
            )}
            {user?.role === 'doctor' && (
              <>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Specialization</p>
                    <p className="font-medium text-gray-900">{user?.specialization || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">License Number</p>
                    <p className="font-medium text-gray-900">{user?.license_number || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium text-gray-900">{user?.doctor_department || 'Not provided'}</p>
                  </div>
                </div>
              </>
            )}
            {user?.role === 'nurse' && (
              <>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">License Number</p>
                    <p className="font-medium text-gray-900">{user?.nurse_license || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium text-gray-900">{user?.nurse_department || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Shift Preference</p>
                    <p className="font-medium text-gray-900">{user?.shift_preference || 'Not provided'}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

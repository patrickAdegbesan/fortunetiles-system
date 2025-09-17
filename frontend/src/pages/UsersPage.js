import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchUsers, createUser, updateUser, deactivateUser, activateUser, fetchUserRoles, fetchLocations } from '../services/api';
import SidebarNav from '../components/SidebarNav';
import PageHeader from '../components/PageHeader';
import UserEditor from '../components/UserEditor';
import '../styles/UsersPage.css';

const UsersPage = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Check if current user is owner (admin)
  const isOwner = user?.role === 'owner';

  const loadUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedRole && { role: selectedRole }),
        ...(selectedStatus && { isActive: selectedStatus })
      };

      const [usersData, rolesData, locationsData] = await Promise.all([
        fetchUsers(params),
        fetchUserRoles(),
        fetchLocations()
      ]);

      setUsers(usersData.users || []);
      setPagination(usersData.pagination || {});
      setRoles(rolesData.roles || []);
      setLocations(locationsData.locations || []);
    } catch (error) {
      setError('Failed to load users');
      console.error('Load users error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedRole, selectedStatus, pagination.limit]);

  useEffect(() => {
    if (isOwner) {
      loadUsers();
    }
  }, [loadUsers, isOwner]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesStatus = !selectedStatus || user.isActive.toString() === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowEditor(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditor(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      setLoading(true);
      setError('');

      if (editingUser) {
        await updateUser(editingUser.id, userData);
        setSuccess('User updated successfully');
      } else {
        await createUser(userData);
        setSuccess('User created successfully');
      }

      setShowEditor(false);
      setEditingUser(null);
      loadUsers(pagination.page);

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus, userName) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} "${userName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      if (currentStatus) {
        await deactivateUser(userId);
        setSuccess('User deactivated successfully');
      } else {
        await activateUser(userId);
        setSuccess('User activated successfully');
      }
      
      loadUsers(pagination.page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadUsers(newPage);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'owner': return 'role-owner';
      case 'manager': return 'role-manager';
      case 'staff': return 'role-staff';
      default: return 'role-default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Redirect if not owner
  if (!isOwner) {
    return (
      <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
        <div className="users-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
          <PageHeader
            icon="👥"
            title="User Management"
            subtitle="Access Denied"
          />
          <div style={{ padding: '20px' }}>
            <div className="access-denied">
              <h2>Access Denied</h2>
              <p>You don't have permission to manage users.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
      <div className="users-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        <PageHeader
          icon="👥"
          title="User Management"
          subtitle="Manage user accounts and permissions"
          stats={[
            { label: 'Total Users', value: pagination.total || filteredUsers.length },
            { label: 'Active', value: filteredUsers.filter(u => u.isActive).length },
            { label: 'Inactive', value: filteredUsers.filter(u => !u.isActive).length }
          ]}
          actions={
            <button className="primary-button" onClick={handleCreateUser}>
              ➕ Add User
            </button>
          }
        />
        
        <div className="users-container" style={{ padding: '20px' }}>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="users-controls">
          <div className="search-filters">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="role-filter"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="status-filter"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div className="users-stats">
          <span>Total Users: {pagination.total || filteredUsers.length}</span>
          <span>Active: {filteredUsers.filter(u => u.isActive).length}</span>
          <span>Inactive: {filteredUsers.filter(u => !u.isActive).length}</span>
        </div>

        {loading && <div className="loading">Loading users...</div>}

        {!loading && (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className={!user.isActive ? 'inactive-user' : ''}>
                    <td>
                      <div className="user-info">
                        <strong>{user.firstName} {user.lastName}</strong>
                        <small>{user.email}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td>
                      {user.location ? user.location.name : 'No Location'}
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="user-actions">
                        <button 
                          className="edit-btn-small"
                          onClick={() => handleEditUser(user)}
                          title="Edit User"
                        >
                          ✏️
                        </button>
                        <button 
                          className={`toggle-btn-small ${user.isActive ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleUserStatus(user.id, user.isActive, `${user.firstName} ${user.lastName}`)}
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.isActive ? '🚫' : '✅'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && !loading && (
              <div className="no-users">
                <p>No users found matching your criteria.</p>
                <button onClick={handleCreateUser} className="add-first-user-btn">
                  Add Your First User
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="pagination-btn"
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            
            <button 
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showEditor && (
        <UserEditor
          user={editingUser}
          roles={roles}
          locations={locations}
          onSave={handleSaveUser}
          onCancel={() => {
            setShowEditor(false);
            setEditingUser(null);
          }}
        />
      )}
        </div>
    </>
  );
};

export default UsersPage;

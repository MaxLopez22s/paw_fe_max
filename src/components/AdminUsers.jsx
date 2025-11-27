import React, { useState, useEffect } from 'react';
import './AdminUsers.css';

const AdminUsers = ({ usuario, isAdmin }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [userForm, setUserForm] = useState({
    telefono: '',
    password: '',
    name: '',
    email: '',
    isAdmin: false
  });

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/admin/users?adminTelefono=${usuario}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        setMessage('❌ Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setMessage('❌ Error de conexión. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setUserForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateUser = async () => {
    if (!userForm.telefono || !userForm.password || !userForm.name) {
      setMessage('⚠️ Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminTelefono: usuario,
          ...userForm
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Usuario creado exitosamente`);
        setShowCreateForm(false);
        resetForm();
        await loadUsers();
      } else {
        setMessage(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creando usuario:', error);
      setMessage('❌ Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminTelefono: usuario,
          name: userForm.name,
          email: userForm.email,
          password: userForm.password || undefined,
          isAdmin: userForm.isAdmin
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Usuario actualizado exitosamente`);
        setEditingUser(null);
        resetForm();
        await loadUsers();
      } else {
        setMessage(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      setMessage('❌ Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/auth/admin/users/${userId}?adminTelefono=${usuario}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Usuario eliminado exitosamente`);
        await loadUsers();
      } else {
        setMessage(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      setMessage('❌ Error al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserForm({
      telefono: '',
      password: '',
      name: '',
      email: '',
      isAdmin: false
    });
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setUserForm({
      telefono: user.telefono,
      password: '',
      name: user.name,
      email: user.email || '',
      isAdmin: user.isAdmin || false
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowCreateForm(false);
    resetForm();
  };

  if (!isAdmin) {
    return (
      <div className="admin-users-container">
        <div className="access-denied">
          <h2>🔒 Acceso Denegado</h2>
          <p>Esta sección es solo para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users-container">
      <div className="admin-header">
        <h2>👥 Gestión de Usuarios</h2>
        <div className="header-actions">
          <button onClick={loadUsers} disabled={loading} className="refresh-btn">
            {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
          </button>
          <button
            onClick={() => {
              cancelEdit();
              setShowCreateForm(!showCreateForm);
            }}
            className="create-btn"
          >
            {showCreateForm ? '❌ Cancelar' : '➕ Crear Usuario'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`admin-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
          <button onClick={() => setMessage('')} className="close-message">×</button>
        </div>
      )}

      {/* Formulario de Crear/Editar */}
      {showCreateForm && (
        <div className="user-form-section">
          <h3>{editingUser ? '✏️ Editar Usuario' : '➕ Crear Nuevo Usuario'}</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Teléfono *</label>
              <input
                type="tel"
                value={userForm.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                placeholder="123456789"
                disabled={!!editingUser}
                required
              />
            </div>

            <div className="form-group">
              <label>Nombre Completo *</label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nombre del usuario"
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}</label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Contraseña"
                required={!editingUser}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="usuario@email.com"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={userForm.isAdmin}
                  onChange={(e) => handleInputChange('isAdmin', e.target.checked)}
                />
                Administrador
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              disabled={loading}
              className="save-btn"
            >
              {loading ? '⏳ Guardando...' : editingUser ? '💾 Actualizar' : '➕ Crear'}
            </button>
            {editingUser && (
              <button onClick={cancelEdit} className="cancel-btn">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de Usuarios */}
      <div className="users-section">
        <h3>📋 Lista de Usuarios ({users.length})</h3>

        {loading && !showCreateForm ? (
          <div className="loading">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="no-users">No hay usuarios registrados</div>
        ) : (
          <div className="users-table">
            <div className="table-header">
              <div className="col-tel">Teléfono</div>
              <div className="col-name">Nombre</div>
              <div className="col-email">Email</div>
              <div className="col-admin">Admin</div>
              <div className="col-actions">Acciones</div>
            </div>
            {users.map(user => (
              <div key={user._id} className="table-row">
                <div className="col-tel">{user.telefono}</div>
                <div className="col-name">{user.name}</div>
                <div className="col-email">{user.email || '-'}</div>
                <div className="col-admin">
                  {user.isAdmin ? '✅' : '❌'}
                </div>
                <div className="col-actions">
                  <button
                    onClick={() => startEdit(user)}
                    className="edit-btn"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user._id)}
                    className="delete-btn"
                    title="Eliminar"
                    disabled={user.telefono === usuario}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;


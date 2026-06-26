import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../utils/formatDate';
import type { AdminUser } from '../types';

const PAGE_SIZE = 10;

export default function UserListPage() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) {
      return;
    }

    api
      .getUsers()
      .then(setUsers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [api]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const email = user.email.toLowerCase();
      const username = user.username?.toLowerCase() ?? '';
      return email.includes(query) || username.includes(query);
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  if (loading) {
    return <p className="page-status">Loading users…</p>;
  }

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  return (
    <div className="page">
      <div className="table-card user-list-card">
        <div className="user-list-toolbar">
          <input
            type="search"
            className="user-search-input"
            placeholder="Search by email or username…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>POI collections</th>
              <th>Custom POI collections</th>
              <th>Custom POIs created</th>
              <th>Joined</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="user-list-empty">
                  {search.trim() ? 'No users match your search.' : 'No users found.'}
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="table-row-link"
                  onClick={() => navigate(`/users/${user.id}`)}
                >
                  <td>{user.email}</td>
                  <td>{user.poi_discoveries}</td>
                  <td>{user.custom_poi_discoveries}</td>
                  <td>{user.custom_pois_created}</td>
                  <td>{formatDate(user.created_at)}</td>
                  <td className="table-row-chevron" aria-hidden="true">
                    →
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredUsers.length > 0 && (
          <div className="pagination">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="pagination-status">
              Page {page} of {totalPages}
              {search.trim() && ` · ${filteredUsers.length} results`}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { categoryMap } from '../data/categories';
import type { CreateItemPayload, Item } from '../types';

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const roundNumber = (value: number) => (Number.isFinite(value) ? Number(value.toFixed(2)) : 0);

export default function CategoryPage() {
  const { key } = useParams<{ key: Item['category'] }>();
  const navigate = useNavigate();
  const config = key ? categoryMap[key] : undefined;

  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [search, setSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{
    pending: CreateItemPayload;
    existing: Item;
  } | null>(null);
  const [zeroModal, setZeroModal] = useState<Item | null>(null);
  const [deleteModal, setDeleteModal] = useState<Item | null>(null);

  const [addForm, setAddForm] = useState({
    name: '',
    mode: 'weight' as 'weight' | 'length',
    amount: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    weight: 0,
    length: 0,
    quantity: 0,
  });

  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    if (!config) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.listItems(config.key, {
          search: debouncedSearch,
          availableOnly,
        });
        setItems(data);
        if (selected) {
          const fresh = data.find((item) => item.id === selected.id);
          if (fresh) {
            setSelected(fresh);
            setEditForm({
              name: fresh.name,
              weight: fresh.weight,
              length: fresh.length,
              quantity: fresh.quantity,
            });
          }
        }
      } catch (err: any) {
        setError(err.message || 'Не удалось получить список');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [config, debouncedSearch, availableOnly]);

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      weight: selected.weight,
      length: selected.length,
      quantity: selected.quantity,
    });
  }, [selected]);

  const listTitle = useMemo(() => {
    if (!config) return '';
    return `${config.title}: ${availableOnly ? 'с остатком' : 'все позиции'}`;
  }, [config, availableOnly]);

  if (!config) {
    return (
      <div className="page">
        <div className="card">
          <p>Такой категории нет.</p>
          <button onClick={() => navigate('/')}>Назад</button>
        </div>
      </div>
    );
  }

  const refreshList = async () => {
    setLoading(true);
    try {
      const data = await api.listItems(config.key, {
        search: debouncedSearch,
        availableOnly,
      });
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Не удалось обновить список');
    } finally {
      setLoading(false);
    }
  };

  const buildAddPayload = (): CreateItemPayload | null => {
    if (!addForm.name.trim()) {
      setError('Введите название позиции');
      return null;
    }
    const numericAmount = Number(addForm.amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setError('Введите неотрицательное число');
      return null;
    }

    if (config.key === 'raw') {
      return {
        category: config.key,
        name: addForm.name.trim(),
        mode: addForm.mode,
        amount: numericAmount,
      };
    }

    return {
      category: config.key,
      name: addForm.name.trim(),
      quantity: numericAmount,
    };
  };

  const handleAdd = async () => {
    setError(null);
    setStatus(null);
    const payload = buildAddPayload();
    if (!payload) return;

    try {
      setSaving(true);
      await api.createItem(payload);
      setAddForm({ name: '', mode: 'weight', amount: '' });
      setDuplicate(null);
      setStatus('Позиция добавлена');
      await refreshList();
    } catch (err: any) {
      if (err.status === 409 && err.data?.existing) {
        setDuplicate({ pending: payload, existing: err.data.existing as Item });
        return;
      }
      setError(err.message || 'Не удалось добавить позицию');
    } finally {
      setSaving(false);
    }
  };

  const confirmDuplicate = async () => {
    if (!duplicate) return;
    try {
      setSaving(true);
      await api.createItem({ ...duplicate.pending, force: true });
      setDuplicate(null);
      setStatus('Позиция обновлена (добавили к существующей)');
      await refreshList();
    } catch (err: any) {
      setError(err.message || 'Не удалось добавить к существующей позиции');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setError(null);
    setStatus(null);
    try {
      setSaving(true);
      const updated = await api.updateItem(selected.id, {
        name: editForm.name.trim() || selected.name,
        weight: roundNumber(editForm.weight),
        length: roundNumber(editForm.length),
        quantity: roundNumber(editForm.quantity),
      });
      setSelected(updated);
      setStatus('Изменения сохранены');
      await refreshList();
    } catch (err: any) {
      if (err.status === 409 && err.data?.existing) {
        setError('Такое имя уже есть в этой категории');
      } else {
        setError(err.message || 'Не удалось сохранить');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleZero = () => {
    if (!selected) return;
    setZeroModal(selected);
  };

  const confirmZero = async () => {
    if (!zeroModal) return;
    setError(null);
    try {
      setSaving(true);
      const updated = await api.zeroItem(zeroModal.id);
      setSelected(updated);
      setStatus('Остаток обнулен (запись сохранена)');
      await refreshList();
    } catch (err: any) {
      setError(err.message || 'Не удалось обнулить остаток');
    } finally {
      setSaving(false);
      setZeroModal(null);
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    setDeleteModal(selected);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setError(null);
    try {
      setSaving(true);
      await api.deleteItem(deleteModal.id);
      setStatus('Позиция удалена полностью');
      setSelected(null);
      await refreshList();
    } catch (err: any) {
      setError(err.message || 'Не удалось удалить позицию');
    } finally {
      setSaving(false);
      setDeleteModal(null);
    }
  };

  const showAvailableButtonLabel = availableOnly
    ? 'Показать все'
    : 'Показать только с остатком';

  const handleExport = () => {
    if (!items.length) {
      setStatus('Нет данных для выгрузки');
      return;
    }
    const rows = [
      ['Наименование', 'Вес, т', 'Длина, м', 'Количество'],
      ...items.map((item) => [
        item.name,
        roundNumber(item.weight),
        roundNumber(item.length),
        roundNumber(item.quantity),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${dateStr}-${config.key}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`Выгружено в файл ${fileName}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{config.subtitle}</p>
          <h1 style={{ color: config.accent }}>{config.title}</h1>
          <p className="helper">{config.helper}</p>
          <div className="actions-inline">
            <button className="ghost" onClick={() => navigate('/')}>
              На главную
            </button>
            <button className="secondary" onClick={() => setAvailableOnly((v) => !v)}>
              {showAvailableButtonLabel}
            </button>
            <button className="secondary" onClick={handleExport}>
              Выгрузить в Excel
            </button>
          </div>
        </div>
        <div className="summary">
          <p className="eyebrow">В списке</p>
          <h2>{items.length}</h2>
          <p className="helper">{listTitle}</p>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>Добавить позицию</h3>
          <span className="pill">Новая запись</span>
        </div>
        <div className="form">
          <label>
            Наименование
            <input
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Например, сталь 12Х18Н10Т"
            />
          </label>

          {config.key === 'raw' ? (
            <div className="row">
              <label>
                Величина
                <select
                  value={addForm.mode}
                  onChange={(e) => setAddForm((f) => ({ ...f, mode: e.target.value as 'weight' | 'length' }))}
                >
                  <option value="weight">Тонны</option>
                  <option value="length">Метры</option>
                </select>
              </label>
              <label>
                Значение
                <input
                  type="number"
                  min="0"
                  value={addForm.amount}
                  onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                />
              </label>
            </div>
          ) : (
            <label>
              Количество
              <input
                type="number"
                min="0"
                value={addForm.amount}
                onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </label>
          )}

          <button className="primary" onClick={handleAdd} disabled={saving}>
            Добавить
          </button>
          {status && <p className="status success">{status}</p>}
          {error && <p className="status error">{error}</p>}
        </div>
      </div>

      {selected && (
        <div className="card">
          <div className="section-header">
            <h3>Карточка позиции</h3>
            <span className="pill neutral">ID {selected.id}</span>
          </div>
          <div className="form two-col">
            <label>
              Наименование
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>

            {selected.category === 'raw' ? (
              <>
                <label>
                  Вес, т
                  <input
                    type="number"
                    min="0"
                    value={editForm.weight}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, weight: Number(e.target.value) || 0 }))
                    }
                  />
                </label>
                <label>
                  Длина, м
                  <input
                    type="number"
                    min="0"
                    value={editForm.length}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, length: Number(e.target.value) || 0 }))
                    }
                  />
                </label>
              </>
            ) : (
              <label>
                Количество
                <input
                  type="number"
                  min="0"
                  value={editForm.quantity}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, quantity: Number(e.target.value) || 0 }))
                  }
                />
              </label>
            )}
          </div>

          <div className="actions-inline">
            <button className="secondary" onClick={handleSave} disabled={saving}>
              Сохранить изменения
            </button>
            <button className="ghost danger" onClick={handleZero} disabled={saving}>
              Обнулить остаток (не удалять)
            </button>
            <button className="ghost" onClick={() => setSelected(null)}>
              Закрыть карточку
            </button>
            <span className="spacer" />
            <button className="ghost subtle-danger" onClick={handleDelete} disabled={saving}>
              Удалить полностью
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <h3>Список позиций</h3>
          <div className="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск (с задержкой)"
            />
            <span className="hint">debounce 0.4s</span>
          </div>
        </div>

        {loading && <p>Загрузка...</p>}
        {!loading && items.length === 0 && <p>Пока нет записей</p>}

        <div className="list">
          {items.map((item) => (
            <button
              key={item.id}
              className={`list-item ${selected?.id === item.id ? 'active' : ''}`}
              onClick={() => setSelected(item)}
            >
              <div>
                <p className="item-name">{item.name}</p>
                <p className="helper">
                  {item.category === 'raw'
                    ? `Вес: ${roundNumber(item.weight)} т · Длина: ${roundNumber(item.length)} м`
                    : `Количество: ${roundNumber(item.quantity)}`}
                </p>
              </div>
              <span className="chevron">›</span>
            </button>
          ))}
        </div>
      </div>

      {duplicate && (
        <div className="modal">
          <div className="modal-content">
            <p className="eyebrow">У вас уже есть такая позиция</p>
            <h3>{duplicate.existing.name}</h3>
            <p className="helper">
              Текущие данные:{' '}
              {duplicate.existing.category === 'raw'
                ? `Вес: ${roundNumber(duplicate.existing.weight)} т · Длина: ${roundNumber(
                    duplicate.existing.length,
                  )} м`
                : `Количество: ${roundNumber(duplicate.existing.quantity)}`}
            </p>
            <div className="actions-inline">
              <button className="ghost" onClick={() => setDuplicate(null)}>
                Отмена
              </button>
              <button className="primary" onClick={confirmDuplicate} disabled={saving}>
                Добавить к существующей
              </button>
            </div>
          </div>
        </div>
      )}

      {zeroModal && (
        <div className="modal">
          <div className="modal-content">
            <p className="eyebrow">Подтверждение</p>
            <h3>Вы точно хотите обнулить данную позицию?</h3>
            <p className="helper">
              {zeroModal.name}
              <br />
              {zeroModal.category === 'raw'
                ? `Вес: ${roundNumber(zeroModal.weight)} т · Длина: ${roundNumber(
                    zeroModal.length,
                  )} м`
                : `Количество: ${roundNumber(zeroModal.quantity)}`}
            </p>
            <div className="actions-inline">
              <button className="ghost" onClick={() => setZeroModal(null)}>
                Отмена
              </button>
              <button className="primary" onClick={confirmZero} disabled={saving}>
                Обнулить
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="modal">
          <div className="modal-content">
            <p className="eyebrow">Внимание</p>
            <h3>Удалить позицию полностью?</h3>
            <p className="helper">
              {deleteModal.name}
              <br />
              {deleteModal.category === 'raw'
                ? `Вес: ${roundNumber(deleteModal.weight)} т · Длина: ${roundNumber(
                    deleteModal.length,
                  )} м`
                : `Количество: ${roundNumber(deleteModal.quantity)}`}
            </p>
            <div className="actions-inline">
              <button className="ghost" onClick={() => setDeleteModal(null)}>
                Отмена
              </button>
              <button className="primary" onClick={confirmDelete} disabled={saving}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

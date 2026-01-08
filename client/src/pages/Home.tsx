import { Link } from 'react-router-dom';
import type { CategoryConfig } from '../data/categories';

interface Props {
  categories: CategoryConfig[];
}

export default function Home({ categories }: Props) {
  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Простая система учета склада</p>
          <h1>Сырье, оборудование, расходники — в одном окне</h1>
          <p className="lede">
            Добавляйте новые позиции, ищите по складу с задержкой (debounce), редактируйте и
            обнуляйте остатки без удаления записей из базы.
          </p>
          <div className="hero-actions">
            <Link className="primary" to="/category/raw">
              Перейти к сырью
            </Link>
            <Link className="ghost" to="/category/equipment">
              Перейти к оборудованию
            </Link>
          </div>
        </div>
      </section>

      <section className="category-grid">
        {categories.map((category) => (
          <Link key={category.key} to={`/category/${category.key}`} className="category-card">
            <div className="card-accent" style={{ background: category.accent }} />
            <div className="card-body">
              <p className="eyebrow">{category.subtitle}</p>
              <h3>{category.title}</h3>
              <p className="helper">{category.helper}</p>
              <span className="card-link">Открыть</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import CategoryPage from './pages/CategoryPage';
import Home from './pages/Home';
import { categoryList } from './data/categories';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <Link to="/" className="brand">
            Учет склада
          </Link>
          <nav className="topnav">
            {categoryList.map((category) => (
              <Link key={category.key} to={`/category/${category.key}`} style={{ color: category.accent }}>
                {category.title}
              </Link>
            ))}
          </nav>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<Home categories={categoryList} />} />
            <Route path="/category/:key" element={<CategoryPage />} />
          </Routes>
        </main>

        <footer className="footer">
          <span>SQLite файл: data/warehouse.sqlite</span>
          <span>React + Node.js + SQLite</span>
        </footer>
      </div>
    </BrowserRouter>
  );
}

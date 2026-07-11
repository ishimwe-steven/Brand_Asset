import { useEffect, useState } from "react";
import { createCategory, deleteCategory, getCategories } from "../../services/category.service";

const Categories = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => setItems((await getCategories()).data || []);

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await createCategory(form);
    setForm({ name: "", description: "" });
    load();
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Categories</h1><p>Manage product categories.</p></div>

      <form className="form-card admin-form" onSubmit={submit}>
        <input placeholder="Category name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required />
        <input placeholder="Description" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} />
        <button>Add Category</button>
      </form>

      <div className="section-card">
        <table><thead><tr><th>Name</th><th>Description</th><th>Action</th></tr></thead>
          <tbody>{items.map(i=><tr key={i.id}><td>{i.name}</td><td>{i.description}</td><td><button className="danger-btn" onClick={()=>deleteCategory(i.id).then(load)}>Delete</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

export default Categories;
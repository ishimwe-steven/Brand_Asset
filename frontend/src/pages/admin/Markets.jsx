import { useEffect, useState } from "react";
import { createMarket, deleteMarket, getMarkets } from "../../services/market.service";

const Markets = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const load = async () => setItems((await getMarkets()).data || []);

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await createMarket(form);
    setForm({ name: "", code: "", description: "" });
    load();
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Markets</h1><p>Manage export markets.</p></div>

      <form className="form-card admin-form" onSubmit={submit}>
        <input placeholder="Market name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required />
        <input placeholder="Code e.g RW" value={form.code} onChange={(e)=>setForm({...form,code:e.target.value})} required />
        <input placeholder="Description" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} />
        <button>Add Market</button>
      </form>

      <div className="section-card">
        <table><thead><tr><th>Name</th><th>Code</th><th>Description</th><th>Action</th></tr></thead>
          <tbody>{items.map(i=><tr key={i.id}><td>{i.name}</td><td>{i.code}</td><td>{i.description}</td><td><button className="danger-btn" onClick={()=>deleteMarket(i.id).then(load)}>Delete</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

export default Markets;
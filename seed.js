const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'store', user: 'admin', password: '123456' });
const products = [{name:'iPhone 15 Pro',price:5500,description:'Apple phone',stock:15},{name:'Samsung S24',price:4000,description:'Samsung phone',stock:20},{name:'Nike Air Max',price:800,description:'Sneakers',stock:30},{name:'Adidas Hoodie',price:350,description:'Hoodie',stock:50},{name:'Leather Wallet',price:200,description:'Wallet',stock:60}];
async function seed() { for (const p of products) { try { await pool.query('INSERT INTO products (name, price, description, stock) VALUES ($1, $2, $3, $4)',[p.name,p.price,p.description,p.stock]); console.log('✅', p.name); } catch (e) { console.log('❌', p.name, e.message); } } console.log('🎉 Done!'); process.exit(); }
seed();

// /src/components/ProductList.js
import React from 'react';
import Product from './Product';
import products from '../data/products';

const ProductList = ({ addToCart }) => {
  return (
    <div className="product-list">
      {products.map((product) => (
        <Product key={product.id} product={product} addToCart={addToCart} />
      ))}
    </div>
  );
};

export default ProductList;

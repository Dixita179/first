// /src/components/Checkout.js
import React from 'react';

const Checkout = ({ cart }) => {
  const total = cart.reduce((acc, item) => acc + item.price, 0);

  return (
    <div>
      <h2>Checkout</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty. Please add some items before proceeding.</p>
      ) : (
        <div>
          <h3>Your Order</h3>
          <ul>
            {cart.map((item, index) => (
              <li key={index}>{item.name} - ${item.price}</li>
            ))}
          </ul>
          <p>Total: ${total}</p>
          <button>Confirm Order</button>
        </div>
      )}
    </div>
  );
};

export default Checkout;

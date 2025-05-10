const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');

const createCustomersRouter = (knex) => {
  const router = express.Router();

  // GET /api/customers - Fetch all customers
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const customers = await knex('customers').select('*').orderBy('name');
      res.status(200).json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers.' });
    }
  });

  // GET /api/customers/:id - Fetch a single customer's details
  router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const customer = await knex('customers').where({ id }).first();
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found.' });
      }
      res.status(200).json(customer);
    } catch (error) {
      console.error(`Error fetching customer with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to fetch customer data.' });
    }
  });

  // POST /api/customers - Create a new customer
  router.post('/', authenticateToken, async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and Email are required.' });
    }
    try {
      const existingCustomer = await knex('customers').where({ email }).first();
      if (existingCustomer) {
        return res.status(409).json({ message: 'Customer with this email already exists.' });
      }
      const [newCustomer] = await knex('customers')
        .insert({ name: name.trim(), email: email.trim() })
        .returning('*');
      res.status(201).json(newCustomer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ message: 'Failed to create customer.' });
    }
  });

  // PUT /api/customers/:id - Update an existing customer
  router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and Email are required.' });
    }
    try {
      const updatedCount = await knex('customers')
        .where({ id })
        .update({ name: name.trim(), email: email.trim(), updated_at: knex.fn.now() });
      if (updatedCount === 0) {
        return res.status(404).json({ message: 'Customer not found or no data changed.' });
      }
      const updatedCustomer = await knex('customers').where({ id }).first();
      res.status(200).json(updatedCustomer);
    } catch (error) {
      console.error(`Error updating customer with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to update customer.' });
    }
  });

  // DELETE /api/customers/:id - Delete a customer
  router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const deletedCount = await knex('customers').where({ id }).del();
      if (deletedCount === 0) {
        return res.status(404).json({ message: 'Customer not found.' });
      }
      res.status(200).json({ message: 'Customer deleted successfully.' });
    } catch (error) {
      console.error(`Error deleting customer with ID ${id}:`, error);
      res.status(500).json({ message: 'Failed to delete customer.' });
    }
  });

  return router;
};

module.exports = createCustomersRouter;
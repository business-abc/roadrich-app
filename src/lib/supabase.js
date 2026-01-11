/**
 * ROADRICH - Supabase Client
 * Database integration for auth and data persistence
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwwhloyuqikjaulsrstr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3d2hsb3l1cWlramF1bHNyc3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjAzOTYsImV4cCI6MjA4MzY5NjM5Nn0.XoB0SR_6mRW6N9kojMxoTQq65oByYBV-b9HIRYyIwRU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Auth Functions
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Profile Functions
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

export async function createProfile(userId, firstName, monthlyIncome) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      first_name: firstName,
      monthly_income: monthlyIncome,
    })
    .select()
    .single();
  return { data, error };
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  return { data, error };
}

/**
 * Category Functions
 */
export async function getCategories(userId) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function createCategory(userId, name, icon, color, budgetLimit) {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name,
      icon,
      color,
      budget_limit: budgetLimit,
    })
    .select()
    .single();
  return { data, error };
}

export async function updateCategory(categoryId, updates) {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single();
  return { data, error };
}

export async function deleteCategory(categoryId) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);
  return { error };
}

/**
 * Expense Functions
 */
export async function getExpenses(userId, startDate, endDate) {
  let query = supabase
    .from('expenses')
    .select('*, categories(name, icon, color)')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function createExpense(userId, categoryId, amount, date = null, isRecurring = false, recurrenceDay = null, description = null) {
  const expenseDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      category_id: categoryId,
      amount,
      date: expenseDate,
      is_recurring: isRecurring,
      recurrence_day: recurrenceDay,
      description,
    })
    .select()
    .single();
  return { data, error };
}

export async function updateExpense(expenseId, updates) {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', expenseId)
    .select()
    .single();
  return { data, error };
}

export async function deleteExpense(expenseId) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);
  return { error };
}

/**
 * Dashboard Data
 */
export async function getDashboardData(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Last month dates
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  // Get profile
  const { data: profile } = await getProfile(userId);

  // Get categories
  const { data: categories } = await getCategories(userId);

  // Get this month's expenses
  const { data: expenses } = await getExpenses(userId, startOfMonth, endOfMonth);

  // Get last month's expenses for comparison
  const { data: lastMonthExpenses } = await getExpenses(userId, startOfLastMonth, endOfLastMonth);

  // Calculate totals
  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const remainingBudget = (profile?.monthly_income || 0) - totalExpenses;

  return {
    profile,
    categories: categories || [],
    expenses: expenses || [],
    lastMonthExpenses: lastMonthExpenses || [],
    totalExpenses,
    remainingBudget,
  };
}

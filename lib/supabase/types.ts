// Types Supabase — à régénérer après chaque migration via :
// npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// -- Enums ---------------------------------------------------

export type UserRole = "super_admin" | "admin" | "manager" | "foreman" | "worker" | "client";
export type MaterialCategory = "cement" | "steel" | "wood" | "sand_gravel" | "paint" | "electrical" | "plumbing" | "tools" | "other";
export type MovementType = "purchase" | "use" | "return" | "adjustment";
export type SubscriptionPlan = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";
export type ProjectStatus = "planned" | "in_progress" | "paused" | "completed" | "canceled";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high";
export type PhotoSource = "web" | "mobile" | "whatsapp";
export type ExpenseCategory = "materials" | "labor" | "transport" | "other";

// -- Row types -----------------------------------------------

export type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  header_url: string | null;
  footer_url: string | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  company_id: string | null;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  specialty: string | null;
  daily_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  address: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  client_id: string | null;
  budget: number | null;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  progress_pct: number;
  cover_photo_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectAssignment = {
  id: string;
  project_id: string;
  user_id: string;
  role_on_project: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type ProjectPhoto = {
  id: string;
  project_id: string;
  storage_path: string;
  caption: string | null;
  ai_analysis: Json | null;
  taken_at: string;
  uploaded_by: string | null;
  source: PhotoSource;
  geo_lat: number | null;
  geo_lng: number | null;
};

export type ProjectDocument = {
  id: string;
  project_id: string;
  storage_path: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type ProjectExpense = {
  id: string;
  project_id: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  spent_at: string;
  created_by: string | null;
  created_at: string;
};

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "expired";
export type QuoteItemCategory = "material" | "labor" | "transport" | "equipment" | "other";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "canceled";
export type PaymentMethod = "cash" | "bank" | "mobile_money" | "geniuspay" | "flutterwave";

export type Quote = {
  id: string;
  company_id: string;
  project_id: string | null;
  client_id: string | null;
  client_name: string | null;
  quote_number: string;
  project_type: string | null;
  surface_m2: number | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  margin_pct: number;
  total: number;
  status: QuoteStatus;
  valid_until: string | null;
  notes: string | null;
  ai_generated: boolean;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteItem = {
  id: string;
  quote_id: string;
  category: QuoteItemCategory;
  label: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  sort_order: number;
};

export type Invoice = {
  id: string;
  company_id: string;
  project_id: string | null;
  quote_id: string | null;
  client_id: string | null;
  client_name: string | null;
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  created_at: string;
};

export type Team = {
  id: string;
  company_id: string;
  name: string;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  team_id: string;
  user_id: string;
};

export type Material = {
  id: string;
  company_id: string;
  name: string;
  category: string;
  unit: string;
  stock_qty: number;
  min_stock_qty: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  material_id: string;
  project_id: string | null;
  type: MovementType;
  quantity: number;
  unit_cost: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type Attendance = {
  id: string;
  user_id: string;
  project_id: string | null;
  check_in: string;
  check_out: string | null;
  geo_lat_in: number | null;
  geo_lng_in: number | null;
  geo_lat_out: number | null;
  geo_lng_out: number | null;
  hours_worked: number | null;
  notes: string | null;
  created_at: string;
};

// -- Métrés --------------------------------------------------

export type OuvrageType = {
  id: string;
  company_id: string;
  designation: string;
  type_geometrie: string;
  unite_principale: string;
  recette: import("@/lib/calcul-ouvrage").ComposantRecette[];
  created_at: string;
  updated_at: string;
};

export type ProjectOuvrage = {
  id: string;
  project_id: string;
  company_id: string;
  type_id: string | null;
  designation: string;
  type_geometrie: string;
  dimensions: Record<string, number>;
  vides_deduits: import("@/lib/calcul-ouvrage").VideDeduit[];
  quantite_brute: number;
  quantite_nette: number;
  unite_principale: string;
  recette: import("@/lib/calcul-ouvrage").ComposantRecette[];
  recette_calculee: import("@/lib/calcul-ouvrage").ComposantRecetteCalcule[];
  created_at: string;
  updated_at: string;
};

// -- Database ------------------------------------------------

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: { id?: string; name: string; logo_url?: string | null; address?: string | null; phone?: string | null; email?: string | null; currency?: string; plan?: SubscriptionPlan; subscription_status?: SubscriptionStatus; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Company, "id">>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: { id: string; company_id?: string | null; role?: UserRole; full_name?: string | null; email?: string | null; phone?: string | null; avatar_url?: string | null; specialty?: string | null; daily_rate?: number | null; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Omit<User, "id">>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: { id?: string; company_id: string; name: string; description?: string | null; address?: string | null; geo_lat?: number | null; geo_lng?: number | null; client_id?: string | null; budget?: number | null; spent?: number; start_date?: string | null; end_date?: string | null; status?: ProjectStatus; progress_pct?: number; cover_photo_url?: string | null; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Project, "id">>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: { id?: string; project_id: string; title: string; description?: string | null; assigned_to?: string | null; status?: TaskStatus; priority?: TaskPriority; due_date?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Task, "id">>;
        Relationships: [];
      };
      project_assignments: {
        Row: ProjectAssignment;
        Insert: { id?: string; project_id: string; user_id: string; role_on_project?: string | null; start_date?: string | null; end_date?: string | null };
        Update: Partial<Omit<ProjectAssignment, "id">>;
        Relationships: [];
      };
      project_photos: {
        Row: ProjectPhoto;
        Insert: { id?: string; project_id: string; storage_path: string; caption?: string | null; ai_analysis?: Json | null; taken_at?: string; uploaded_by?: string | null; source?: PhotoSource; geo_lat?: number | null; geo_lng?: number | null };
        Update: Partial<Omit<ProjectPhoto, "id">>;
        Relationships: [];
      };
      project_documents: {
        Row: ProjectDocument;
        Insert: { id?: string; project_id: string; storage_path: string; name: string; mime_type?: string | null; size_bytes?: number | null; uploaded_by?: string | null; created_at?: string };
        Update: Partial<Omit<ProjectDocument, "id">>;
        Relationships: [];
      };
      quotes: {
        Row: Quote;
        Insert: { id?: string; company_id: string; project_id?: string | null; client_id?: string | null; client_name?: string | null; quote_number: string; project_type?: string | null; surface_m2?: number | null; subtotal?: number; tax_rate?: number; tax_amount?: number; margin_pct?: number; total?: number; status?: QuoteStatus; valid_until?: string | null; notes?: string | null; ai_generated?: boolean; pdf_url?: string | null; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Quote, "id">>;
        Relationships: [];
      };
      quote_items: {
        Row: QuoteItem;
        Insert: { id?: string; quote_id: string; category: QuoteItemCategory; label: string; quantity: number; unit: string; unit_price: number; total?: number; sort_order?: number };
        Update: Partial<Omit<QuoteItem, "id">>;
        Relationships: [];
      };
      invoices: {
        Row: Invoice;
        Insert: { id?: string; company_id: string; project_id?: string | null; quote_id?: string | null; client_id?: string | null; client_name?: string | null; invoice_number: string; amount?: number; status?: InvoiceStatus; due_date?: string | null; paid_at?: string | null; notes?: string | null; pdf_url?: string | null; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Invoice, "id">>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: { id?: string; invoice_id: string; amount: number; method: PaymentMethod; reference?: string | null; paid_at?: string; created_at?: string };
        Update: Partial<Omit<Payment, "id">>;
        Relationships: [];
      };
      teams: {
        Row: Team;
        Insert: { id?: string; company_id: string; name: string; lead_id?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Team, "id">>;
        Relationships: [];
      };
      team_members: {
        Row: TeamMember;
        Insert: { team_id: string; user_id: string };
        Update: Partial<TeamMember>;
        Relationships: [];
      };
      attendance: {
        Row: Attendance;
        Insert: { id?: string; user_id: string; project_id?: string | null; check_in: string; check_out?: string | null; geo_lat_in?: number | null; geo_lng_in?: number | null; geo_lat_out?: number | null; geo_lng_out?: number | null; hours_worked?: number | null; notes?: string | null; created_at?: string };
        Update: Partial<Omit<Attendance, "id">>;
        Relationships: [];
      };
      debourses_models: {
        Row: { id: string; company_id: string; name: string; inputs: Json; created_at: string; updated_at: string };
        Insert: { id?: string; company_id: string; name: string; inputs: Json; created_at?: string; updated_at?: string };
        Update: { name?: string; inputs?: Json; updated_at?: string };
        Relationships: [];
      };
      material_categories: {
        Row: { id: string; company_id: string; slug: string; label: string; created_at: string };
        Insert: { id?: string; company_id: string; slug: string; label: string; created_at?: string };
        Update: { label?: string };
        Relationships: [];
      };
      materials: {
        Row: Material;
        Insert: { id?: string; company_id: string; name: string; category: string; unit: string; stock_qty?: number; min_stock_qty?: number; unit_cost?: number; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Material, "id">>;
        Relationships: [];
      };
      stock_movements: {
        Row: StockMovement;
        Insert: { id?: string; material_id: string; project_id?: string | null; type: MovementType; quantity: number; unit_cost?: number | null; notes?: string | null; created_by?: string | null; created_at?: string };
        Update: Partial<StockMovement>;
        Relationships: [];
      };
      project_expenses: {
        Row: ProjectExpense;
        Insert: { id?: string; project_id: string; category: ExpenseCategory; amount: number; description?: string | null; receipt_url?: string | null; spent_at?: string; created_by?: string | null; created_at?: string };
        Update: Partial<Omit<ProjectExpense, "id">>;
        Relationships: [];
      };
      ouvrage_types: {
        Row: OuvrageType;
        Insert: { id?: string; company_id: string; designation: string; type_geometrie: string; unite_principale?: string; recette?: Json; created_at?: string; updated_at?: string };
        Update: Partial<Omit<OuvrageType, "id">>;
        Relationships: [];
      };
      project_ouvrages: {
        Row: ProjectOuvrage;
        Insert: { id?: string; project_id: string; company_id: string; type_id?: string | null; designation: string; type_geometrie: string; dimensions?: Json; vides_deduits?: Json; quantite_brute?: number; quantite_nette?: number; unite_principale?: string; recette?: Json; recette_calculee?: Json; created_at?: string; updated_at?: string };
        Update: { designation?: string; type_geometrie?: string; dimensions?: Json; vides_deduits?: Json; quantite_brute?: number; quantite_nette?: number; unite_principale?: string; recette?: Json; recette_calculee?: Json; type_id?: string | null; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_company_id: { Args: Record<string, never>; Returns: string };
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
      project_status: ProjectStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      photo_source: PhotoSource;
      expense_category: ExpenseCategory;
      material_category: MaterialCategory;
      movement_type: MovementType;
      quote_status: QuoteStatus;
      quote_item_category: QuoteItemCategory;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
    };
  };
};

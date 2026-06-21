
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, LogIn, TrendingUp, TrendingDown, Landmark, Banknote, Briefcase, PlusCircle, LineChart, Trash2, Edit, PiggyBank, KeyRound, ExternalLink, RefreshCw } from 'lucide-react';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { ResearchDashboard } from '@/components/research-dashboard';
import { PortfolioDashboard } from '@/components/portfolio-dashboard';
import { LedgerDashboard } from '@/components/ledger-dashboard';
import { CashbookDashboard } from '@/components/cashbook-dashboard';
import { DepositsDashboard } from '@/components/deposits-dashboard';
import type { Transaction, UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { ThresholdsProvider } from '@/hooks/use-alert-thresholds';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type UserProfileWithId = UserProfile & { id: string };
type ApiKey = { id: string; provider: string; key: string; };

function ApiKeysManager() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [provider, setProvider] = useState('');
    const [keyValue, setKeyValue] = useState('');
    const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const savedKeys = localStorage.getItem('apiKeys');
            if (savedKeys) {
                setKeys(JSON.parse(savedKeys));
            }
        } catch (error) {
            console.error("Failed to load API keys", error);
        }
    }, []);

    const saveKeys = (newKeys: ApiKey[]) => {
        setKeys(newKeys);
        localStorage.setItem('apiKeys', JSON.stringify(newKeys));
    };

    const handleAddOrUpdateKey = () => {
        if (!provider || !keyValue) {
            toast({ title: 'Error', description: 'Provider and Key cannot be empty.', variant: 'destructive' });
            return;
        }

        if (editingKey) {
            saveKeys(keys.map(k => k.id === editingKey.id ? { ...k, provider, key: keyValue } : k));
            toast({ title: 'API Key Updated' });
        } else {
            saveKeys([...keys, { id: Date.now().toString(), provider, key: keyValue }]);
            toast({ title: 'API Key Added' });
        }
        setProvider('');
        setKeyValue('');
        setEditingKey(null);
    };

    const handleEdit = (key: ApiKey) => {
        setEditingKey(key);
        setProvider(key.provider);
        setKeyValue(key.key);
    };

    const handleDelete = (id: string) => {
        saveKeys(keys.filter(k => k.id !== id));
        toast({ title: 'API Key Deleted' });
    };
    
    const handleCancelEdit = () => {
        setEditingKey(null);
        setProvider('');
        setKeyValue('');
    };

    return (
        <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><KeyRound size={16}/> Manage API Keys (Global)</h3>
             <p className="text-xs text-muted-foreground">
                Optional data-provider keys (e.g. a free {' '}
                <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1">
                    Alpha Vantage <ExternalLink size={12}/>
                </a> key with the provider name `alphavantage`). AI provider keys live in the AI Providers card on the Research tab.
            </p>
            <div className="p-4 border rounded-lg bg-secondary/30 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-end">
                    <div className='space-y-1'>
                        <Label htmlFor="provider" className="text-xs">Service Provider</Label>
                        <Input id="provider" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. alphavantage" />
                    </div>
                     <div className='space-y-1'>
                        <Label htmlFor="key" className="text-xs">API Key</Label>
                        <Input id="key" type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="Enter your API key" />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleAddOrUpdateKey}>{editingKey ? 'Update Key' : 'Add Key'}</Button>
                        {editingKey && <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>}
                    </div>
                </div>

                {keys.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Provider</TableHead>
                                <TableHead className="text-xs">Key</TableHead>
                                <TableHead className="text-right text-xs">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {keys.map(key => (
                                <TableRow key={key.id}>
                                    <TableCell className="text-xs font-medium">{key.provider}</TableCell>
                                    <TableCell className="text-xs font-mono">****{key.key.slice(-4)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(key)}><Edit size={14}/></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(key.id)}><Trash2 size={14}/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                )}
            </div>
        </div>
    )
}

function UserAuthDialog({ users, onLogin, onAddUser, onDeleteUser, children, currentUser }: { users: UserProfileWithId[], onLogin: (user: UserProfileWithId) => void, onAddUser: (user: UserProfile) => Promise<void>, onDeleteUser: (id: string) => void, children: React.ReactNode, currentUser: UserProfileWithId | null }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleLogin = (user: UserProfileWithId) => {
    onLogin(user);
    setOpen(false);
  }

  const handleAddUser = async (newUser: UserProfile) => {
    await onAddUser(newUser);
  }
  
  const handleClearLocalStorage = () => {
    localStorage.clear();
    toast({ title: "Local Storage Cleared", description: "All application data has been reset. Please refresh the page." });
    setOpen(false);
    setTimeout(() => window.location.reload(), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="text-center">
            <DialogTitle className="font-headline text-base">Welcome to SmartInvest AI</DialogTitle>
            <DialogDescription className="text-xs">Select a profile or add a new one to begin.</DialogDescription>
        </DialogHeader>
        <UserAuthCard users={users} onLogin={handleLogin} onAddUser={handleAddUser} onDeleteUser={onDeleteUser} currentUser={currentUser} />
        {currentUser && (
            <DialogFooter>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full sm:w-auto">
                            <Trash2 className="mr-2" /> Clear All Local Data
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all users, transactions, API keys, and other saved settings from your browser.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearLocalStorage}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PasswordDialog({ children, onConfirm }: { children: React.ReactNode, onConfirm: () => void }) {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const { toast } = useToast();

    const handleConfirm = () => {
        // In a real app, this password should not be hardcoded.
        if (password === '1234') {
            onConfirm();
            setOpen(false);
            setPassword('');
        } else {
            toast({ title: 'Incorrect Password', description: 'Please enter the correct 4-digit password.', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setPassword(''); }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <div className="flex items-baseline gap-2">
                        <DialogTitle className="text-sm">Admin Password Required</DialogTitle>
                        <DialogDescription className="text-xs">Enter the 4-digit password to proceed with this action.</DialogDescription>
                    </div>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        type="password"
                        maxLength={4}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••"
                        className="text-center text-sm tracking-[0.5rem]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function UserAuthCard({ users, onLogin, onAddUser, onDeleteUser, currentUser }: { users: UserProfileWithId[], onLogin: (user: UserProfileWithId) => void, onAddUser: (user: UserProfile) => Promise<void>, onDeleteUser: (id: string) => void, currentUser: UserProfileWithId | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const { toast } = useToast();

  const handleAdd = async () => {
    if (name && email && mobile) {
      await onAddUser({ name, email, mobile, investableAmount: 1500000 });
      setName(''); setEmail(''); setMobile('');
      setOpen(false);
      toast({ title: "User Added", description: `Profile for ${name} has been created.` });
    } else {
      toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
    }
  };
  
  const handleDelete = (id: string, userName: string) => {
      onDeleteUser(id);
      toast({ title: "User Deleted", description: `Profile for ${userName} has been removed.` });
  }

  return (
      <div className="space-y-4 pt-4">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <User size={20} />
              </div>
              <span className="font-medium text-sm">{user.name}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={() => onLogin(user)}>Select</Button>
                <PasswordDialog onConfirm={() => handleDelete(user.id, user.name)}>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                        <Trash2 size={16} />
                    </Button>
                </PasswordDialog>
            </div>
          </div>
        ))}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full mt-4">
              <PlusCircle className="mr-2" size={16} /> Add New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base">Create New User Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="(+91) 9123456789" />
              </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <PasswordDialog onConfirm={handleAdd}>
                    <Button>Add User</Button>
                </PasswordDialog>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {currentUser && <ApiKeysManager />}
      </div>
  );
}

// No login required: a persistent default profile so the app is usable immediately.
// Users can still create/switch profiles, but they never have to sign in first.
const GUEST_USER: UserProfileWithId = { id: 'guest', name: 'Guest', email: '', mobile: '', investableAmount: 100000 };

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserProfileWithId | null>(null);
  const [users, setUsers] = useState<UserProfileWithId[]>([]);
  const [investableAmount, setInvestableAmount] = useState(1500000);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { toast } = useToast();
  const [date, setDate] = useState<string | null>(null);

  // Sync investable amount with Brocker's Fund Movements closing balance
  useEffect(() => {
    const calcBalance = () => {
      let balance = 0;
      const saved = localStorage.getItem('personalAcEntries');
      if (saved) {
        const entries = JSON.parse(saved);
        entries.forEach((e: any) => {
          if (e.type === 'bank-to-broker' || e.type === 'dividend') balance += e.amount;
          else if (e.type === 'broker-to-bank') balance -= e.amount;
        });
      }
      transactions.forEach(tx => {
        const amt = tx.quantity * tx.price;
        if (tx.type === 'sell') balance += amt;
        else balance -= amt;
      });
      if (balance > 0) setInvestableAmount(balance);
    };
    calcBalance();
    const handle = () => setTimeout(calcBalance, 500);
    window.addEventListener('storage', handle);
    const interval = setInterval(calcBalance, 3000);
    return () => {
      window.removeEventListener('storage', handle);
      clearInterval(interval);
    };
  }, [transactions]);

  const handleLogin = useCallback((user: UserProfileWithId) => {
    setCurrentUser(user);
    localStorage.setItem('currentUserId', JSON.stringify(user.id));
  }, []);

  // Load global data and users on initial mount
  useEffect(() => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    try {
      const savedUsers = localStorage.getItem('users');
      const allUsers = savedUsers ? JSON.parse(savedUsers) : [];
      setUsers(allUsers);
      
      const savedUserId = localStorage.getItem('currentUserId');
      const restored = (savedUserId && allUsers.length > 0)
        ? allUsers.find((u: UserProfileWithId) => u.id === JSON.parse(savedUserId))
        : null;
      // Fall back to the guest profile so no sign-in is ever required.
      handleLogin(restored || GUEST_USER);
    } catch (error) {
        console.error("Failed to load user data from localStorage", error);
        setUsers([]);
        handleLogin(GUEST_USER);
    }
  }, [handleLogin]);

  // Load user-specific data when currentUser changes
  useEffect(() => {
    if (currentUser) {
        try {
            setInvestableAmount(currentUser.investableAmount || 1500000);

            const savedTransactions = localStorage.getItem(`transactions_${currentUser.id}`);
            if(savedTransactions) {
                setTransactions(JSON.parse(savedTransactions));
            } else {
                setTransactions([]);
            }
        } catch (error) {
            console.error("Failed to load transactions from localStorage", error);
            setTransactions([]);
        }
    } else {
        // Clear data when no user is logged in
        setInvestableAmount(1500000);
        setTransactions([]);
    }
  }, [currentUser]);


  const handleAddUser = useCallback(async (newUser: UserProfile) => {
    const userWithId = { ...newUser, id: Date.now().toString() };
    const updatedUsers = [...users, userWithId];
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    handleLogin(userWithId);
  }, [users, handleLogin]);
  
  const handleLogout = useCallback(() => {
    localStorage.removeItem('currentUserId');
    setCurrentUser(GUEST_USER); // return to guest rather than an empty, gated screen
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    const newUsers = users.filter(u => u.id !== userId);
    setUsers(newUsers);
    localStorage.setItem('users', JSON.stringify(newUsers));
    localStorage.removeItem(`transactions_${userId}`);
    localStorage.removeItem(`fixedDeposits_${userId}`);
    localStorage.removeItem(`familyMembers_${userId}`);
    localStorage.removeItem(`banks_${userId}`);
    localStorage.removeItem(`screeners_${userId}`);
    localStorage.removeItem(`customPrompts_${userId}`);
    localStorage.removeItem(`customLlms_${userId}`);
    localStorage.removeItem(`smartWatchlist_${userId}`);
    localStorage.removeItem(`stockAlerts_${userId}`);
    localStorage.removeItem(`sentAlerts_${userId}`);
    if (currentUser?.id === userId) {
        handleLogout();
    }
  }, [users, currentUser, handleLogout]);
  
  const handleSetInvestableAmount = useCallback(async (amount: number) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, investableAmount: amount };
    setCurrentUser(updatedUser);
    
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    toast({ title: "Investable Amount Updated", description: `Set to ${formatCurrencyNoDecimal(amount)}`});
  }, [currentUser, users, toast]);

  const handleSetTransactions = useCallback((newTransactions: Transaction[]) => {
      if (!currentUser) return;
      setTransactions(newTransactions);
      localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(newTransactions));
  }, [currentUser]);

  const formatCurrencyNoDecimal = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <ThresholdsProvider userId={currentUser?.id}>
      <div className="flex flex-col min-h-screen bg-secondary/30">
        <Tabs defaultValue="research" className="w-full">
          <header className="sticky top-0 z-50 w-full border-b bg-background">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-4">
                  <Logo className="h-8 w-8 text-white" />
                  <div className="hidden md:flex items-baseline gap-2">
                    <h1 className="font-headline text-sm font-bold tracking-tight text-white">
                        SMARTINVEST AI
                    </h1>
                    <p className="text-xs text-white">Your AI Powered Investment Analyst</p>
                  </div>
                </div>

                <div className="flex-1 flex justify-center items-center gap-4">
                    {date && <span className="font-bold text-sm text-white">{date}</span>}
                </div>
                
                <div className='flex items-center gap-4'>
                    <ThemeToggle />
                    {currentUser ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-white">
                              <span className="font-semibold">{currentUser.name}</span>
                              <span className="text-white"> - Logged In</span>
                          </p>
                        </div>
                        <UserAuthDialog users={users} onLogin={handleLogin} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} currentUser={currentUser}>
                            <Button variant="outline" size="sm" >Profile</Button>
                        </UserAuthDialog>
                        <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                      </div>
                    ) : (
                      <UserAuthDialog users={users} onLogin={handleLogin} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} currentUser={currentUser}>
                        <Button>
                          <LogIn className="mr-2 h-4 w-4" /> Login
                        </Button>
                      </UserAuthDialog>
                    )}
                </div>
              </div>
              {currentUser && (
                <div className="bg-secondary/50 border-t">
                    <div className="container mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
                      <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full sm:w-auto">
                          <TabsTrigger value="research">
                            <LineChart className="w-4 h-4 mr-2" />Research
                          </TabsTrigger>
                          <TabsTrigger value="portfolio">
                            <Briefcase className="w-4 h-4 mr-2" />Portfolio
                          </TabsTrigger>
                           <TabsTrigger value="ledger">
                            <Landmark className="w-4 h-4 mr-2" />Brocker's A/C
                          </TabsTrigger>
                           <TabsTrigger value="cashbook">
                            <Banknote className="w-4 h-4 mr-2" />Personal A/C
                          </TabsTrigger>
                           <TabsTrigger value="deposits">
                            <PiggyBank className="w-4 h-4 mr-2" />Deposits
                          </TabsTrigger>
                      </TabsList>
                    </div>
                </div>
              )}
          </header>

          <main className="flex-1 container mx-auto px-4 py-4">
             
              {currentUser ? (
              <>
                  <TabsContent value="research" className="mt-6">
                    <div className="space-y-6">
                        <ResearchDashboard userId={currentUser.id} />
                    </div>
                  </TabsContent>
                  <TabsContent value="portfolio" className="mt-6">
                  <PortfolioDashboard 
                      investableAmount={investableAmount}
                      onSetInvestableAmount={handleSetInvestableAmount}
                      transactions={transactions}
                      setTransactions={handleSetTransactions}
                      userId={currentUser.id}
                      userName={currentUser.name}
                      userEmail={currentUser.email}
                  />
                  </TabsContent>
                  <TabsContent value="ledger" className="mt-6">
                  <LedgerDashboard transactions={transactions} userId={currentUser.id} />
                  </TabsContent>
                   <TabsContent value="cashbook" className="mt-6">
                    <CashbookDashboard />
                   </TabsContent>
                   <TabsContent value="deposits" className="mt-6">
                    <DepositsDashboard userId={currentUser.id} />
                  </TabsContent>
              </>
              ) : (
                 <div className="flex flex-col items-center justify-center h-96 text-center">
                   
                  </div>
              )}
          </main>
        </Tabs>
      </div>
    </ThresholdsProvider>
  );
}
    
    

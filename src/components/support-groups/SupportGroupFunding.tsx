import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSupportGroupDonations, useLogSupportGroupDonation } from '@/hooks/useSupportGroups';
import { format } from 'date-fns';
import { Plus, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function SupportGroupFunding({ 
  supportGroupId,
  readOnly = false 
}: { 
  supportGroupId: string;
  readOnly?: boolean;
}) {
  const { data: donations, isLoading } = useSupportGroupDonations(supportGroupId);
  const logDonation = useLogSupportGroupDonation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'inflow',
    source: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await logDonation.mutateAsync({
      support_group_id: supportGroupId,
      amount: parseFloat(formData.amount),
      type: formData.type,
      source: formData.source,
      date: formData.date,
      notes: formData.notes,
      logged_by: user?.id
    });
    setIsOpen(false);
    setFormData({ ...formData, amount: '', source: '', notes: '' });
  };

  const totalInflows = donations?.filter(d => d.type === 'inflow').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const totalExpenditures = donations?.filter(d => d.type === 'expenditure').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const balance = totalInflows - totalExpenditures;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold">₦{balance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Inflows</p>
                <p className="text-2xl font-bold text-green-500">₦{totalInflows.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenditures</p>
                <p className="text-2xl font-bold text-red-500">₦{totalExpenditures.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Funding Ledger</CardTitle>
            <CardDescription>Track all inflows and expenditures</CardDescription>
          </div>
          {!readOnly && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="btn-action"><Plus className="w-4 h-4 mr-2" /> Log Fund</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Funding or Expenditure</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <select
                        className="w-full border rounded-md p-2 bg-background"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="inflow">Inflow (Donation/Grant)</option>
                        <option value="expenditure">Expenditure (Expense)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount (₦)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Source / Recipient</label>
                    <Input
                      required
                      placeholder={formData.type === 'inflow' ? "E.g., Central Campaign Fund" : "E.g., Event Logistics Vendor"}
                      value={formData.source}
                      onChange={e => setFormData({ ...formData, source: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <Textarea
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={logDonation.isPending}>
                    {logDonation.isPending ? "Saving..." : "Save Record"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="text-center py-4">Loading ledger...</div>
          ) : donations?.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">No funds recorded yet.</div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Source/Recipient</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {donations?.map((d) => (
                    <tr key={d.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle">{format(new Date(d.date), 'MMM d, yyyy')}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={d.type === 'inflow' ? 'outline' : 'secondary'} className={d.type === 'inflow' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}>
                          {d.type}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="font-medium">{d.source}</span>
                        {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                      </td>
                      <td className={`p-4 align-middle font-bold ${d.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                        {d.type === 'inflow' ? '+' : '-'}₦{Number(d.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

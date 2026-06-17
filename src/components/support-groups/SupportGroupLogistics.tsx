import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMaterialRequests } from '@/hooks/useSupportGroups';
import { format } from 'date-fns';
import { Package, Truck, Clock, CheckCircle2 } from 'lucide-react';

export function SupportGroupLogistics({ supportGroupId }: { supportGroupId: string }) {
  const { data: requests, isLoading } = useMaterialRequests(supportGroupId);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'delivered':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> {status}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-600 bg-yellow-50 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status || 'Pending'}</Badge>;
    }
  };

  const getMaterialsList = (materials: any) => {
    if (!materials) return "None specified";
    if (typeof materials === 'string') return materials;
    if (Array.isArray(materials)) return materials.join(', ');
    if (typeof materials === 'object') {
      return Object.entries(materials).map(([k, v]) => `${k}: ${v}`).join(', ');
    }
    return JSON.stringify(materials);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Material Requests & Logistics
        </CardTitle>
        <CardDescription>Track campaign materials requested by this support group</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading requests...</div>
        ) : requests?.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">No Material Requests</h3>
            <p className="text-sm text-muted-foreground mt-1">This group has not requested any campaign materials.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests?.map(req => (
              <div key={req.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:bg-muted/10 transition-colors">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-semibold text-lg">Event Date: {req.event_date ? format(new Date(req.event_date), 'MMM d, yyyy') : 'Not specified'}</h4>
                    {getStatusBadge(req.status || 'pending')}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                    <div>
                      <span className="text-muted-foreground block mb-1">Requested Materials:</span>
                      <p className="font-medium bg-muted/50 p-2 rounded-md">{getMaterialsList(req.materials)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Event Location:</span>
                      <p className="font-medium p-2">{req.event_location || `${req.lga || ''} ${req.ward ? `/ ${req.ward}` : ''}` || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2 pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground block mb-1">Requester:</span>
                      <p>{req.requester_name || 'N/A'} {req.requester_phone ? `(${req.requester_phone})` : ''}</p>
                    </div>
                    {req.notes && (
                      <div>
                        <span className="text-muted-foreground block mb-1">Notes:</span>
                        <p className="text-muted-foreground italic bg-yellow-50/50 p-2 rounded-md">{req.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-4 text-right">
                    Requested on: {format(new Date(req.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

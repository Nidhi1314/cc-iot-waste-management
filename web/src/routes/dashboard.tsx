import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSession } from '../features/auth/session-context';
import { getBins, getCriticalBins, updateBinFillLevel } from '../features/bins/api';
import { getOperatorAccounts } from '../features/vehicles/api';
import {
  completeRoute,
  deleteRoute,
  generateRoutes,
  generatePredictiveRoutes,
  getActiveRoutes,
  getRoutes,
  simulateNextDay,
  resetBinsToZero,
} from '../features/routes/api';
import { queryClient } from '../lib/query-client';
import { AdminShell } from '../components/admin/admin-shell';
import { DriverShell } from '../components/driver/driver-shell';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, clearSession } = useSession();
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>('');
  const [actionLog, setActionLog] = useState<string[]>([]);

  const isAdmin = user?.role === 'ADMIN';
  const isDriver = user?.role === 'DRIVER';
  const canQuery = Boolean(user);

  const binsQuery = useQuery({
    queryKey: ['bins', { limit: 100, offset: 0 }],
    queryFn: () => getBins(100, 0),
    enabled: canQuery,
  });

  const criticalBinsQuery = useQuery({
    queryKey: ['bins', 'critical'],
    queryFn: getCriticalBins,
    enabled: canQuery && isAdmin,
  });

  const routesQuery = useQuery({
    queryKey: ['routes', { limit: 100, offset: 0 }],
    queryFn: () => getRoutes(100, 0),
    enabled: canQuery && isAdmin,
  });

  const activeRoutesQuery = useQuery({
    queryKey: ['routes', 'active'],
    queryFn: getActiveRoutes,
    enabled: canQuery,
  });

  const operatorAccountsQuery = useQuery({
    queryKey: ['vehicles', { limit: 100, offset: 0 }],
    queryFn: () => getOperatorAccounts(100, 0),
    enabled: canQuery && isAdmin,
  });

  const addLog = (msg: string) => setActionLog((prev) => [...prev, msg]);

  const generateMutation = useMutation({
    mutationFn: generateRoutes,
    onSuccess: (data) => {
      addLog(`< [OK] route generated: ${data[0]?.id ?? 'unknown'}`);
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['bins', 'critical'] });
    },
    onError: (error) => {
      addLog(`< [ERR] ${(error as Error).message}`);
    },
  });

  const generatePredictiveMutation = useMutation({
    mutationFn: generatePredictiveRoutes,
    onSuccess: (data) => {
      if (data.length === 0) {
        addLog('< [ERR] Predictive route service returned no saved route.');
      } else {
        const stopCount = data.reduce(
          (count, route) => count + route.waypointsOrder.length,
          0,
        );
        const routeLabel = data.length === 1 ? 'route' : 'routes';
        const stopLabel = stopCount === 1 ? 'stop' : 'stops';
        const firstRouteId = data[0] ? ` | id: ${data[0].id}` : '';
        addLog(
          `< [OK] predictive result: ${data.length} ${routeLabel}, ${stopCount} ${stopLabel}${firstRouteId}`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['bins', 'critical'] });
    },
    onError: (error) => {
      addLog(`< [ERR] ${(error as Error).message}`);
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
      // Refetch bins so admin sees updated fill levels after route completion
      queryClient.invalidateQueries({ queryKey: ['bins'] });
    },
    onError: () => {},
  });

  const collectBinMutation = useMutation({
    mutationFn: (binId: string) => updateBinFillLevel(binId, 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      queryClient.invalidateQueries({ queryKey: ['bins', 'critical'] });
    },
    onError: (err) => {
      console.error('[collectBin]', (err as Error).message);
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
    },
    onError: () => {},
  });

  const simulateMutation = useMutation({
    mutationFn: simulateNextDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
    },
    onError: () => {},
  });

  const resetMutation = useMutation({
    mutationFn: resetBinsToZero,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
    },
    onError: () => {},
  });

  const bins = binsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const activeRoutes = activeRoutesQuery.data ?? [];
  const operatorAccounts = operatorAccountsQuery.data ?? [];

  const driverRoutes = activeRoutes.filter(
    (route) => route.assignedCarId === user?.id && !route.isCompleted,
  );

  const logout = () => {
    clearSession();
    navigate({ to: '/login' });
  };

  const runGenerate = () => {
    if (!assignedVehicleId) {
      addLog('< [ERR] select a vehicle first');
      return;
    }
    addLog('> POST /routes/generate');
    generateMutation.mutate({ assignedCarId: assignedVehicleId });
  };

  const runGeneratePredictive = () => {
    if (!assignedVehicleId) {
      addLog('< [ERR] select a vehicle first');
      return;
    }
    addLog('> POST /routes/generate-predictive');
    generatePredictiveMutation.mutate({ assignedCarId: assignedVehicleId });
  };

  if (!user) return null;

  if (isDriver) {
    return (
      <DriverShell
        user={user}
        bins={bins}
        binsLoading={binsQuery.isLoading}
        binsError={binsQuery.isError ? (binsQuery.error as Error).message : null}
        routes={driverRoutes}
        routesLoading={activeRoutesQuery.isLoading}
        routesError={activeRoutesQuery.isError ? (activeRoutesQuery.error as Error).message : null}
        completePending={completeMutation.isPending}
        onCompleteRoute={(id) => completeMutation.mutate(id)}
        onBinCollected={(binId) => collectBinMutation.mutate(binId)}
        onLogout={logout}
      />
    );
  }

  return (
    <AdminShell
      user={user}
      bins={bins}
      binsLoading={binsQuery.isLoading}
      binsError={binsQuery.isError ? (binsQuery.error as Error).message : null}
      criticalBins={criticalBinsQuery.data ?? []}
      routes={routes}
      routesLoading={routesQuery.isLoading}
      routesError={routesQuery.isError ? (routesQuery.error as Error).message : null}
      activeRoutes={activeRoutes}
      operatorAccounts={operatorAccounts}
      operatorsLoading={operatorAccountsQuery.isLoading}
      assignedVehicleId={assignedVehicleId}
      onChangeAssignedVehicle={setAssignedVehicleId}
      onGenerate={runGenerate}
      onGeneratePredictive={runGeneratePredictive}
      onCompleteRoute={(id) => completeMutation.mutate(id)}
      onDeleteRoute={(id) => deleteRouteMutation.mutate(id)}
      onSimulateDay={() => simulateMutation.mutateAsync()}
      onResetBins={() => resetMutation.mutateAsync()}
      isPendingGenerate={generateMutation.isPending}
      isPendingPredictive={generatePredictiveMutation.isPending}
      completePending={completeMutation.isPending}
      deletePending={deleteRouteMutation.isPending}
      isPendingSimulate={simulateMutation.isPending}
      isPendingReset={resetMutation.isPending}
      actionLog={actionLog}
      onLogout={logout}
    />
  );
}

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
  generateOrganicRoutes,
  getActiveRoutes,
  getRoutes,
  simulateNextDay,
  resetBinsToZero,
} from '../features/routes/api';
import {
  confirmDelivery,
  createCollection,
  getCollections,
  getImpactSummary,
} from '../features/collections/api';
import type { CollectionPayload } from '../features/collections/api';
import { getDestinations } from '../features/destinations/api';
import { queryClient } from '../lib/query-client';
import { AdminShell } from '../components/admin/admin-shell';
import { DriverShell } from '../components/driver/driver-shell';

import {
  getSettings,
  updateSettings,
} from '../features/settings/api';

import type {
  UpdateSettingsRequest,
} from '../features/settings/api';


import {
  createGenerator,
  updateGenerator,
} from '../features/bins/api';

import type {
  GeneratorPayload,
} from '../features/bins/api';


export function DashboardPage() {
  const navigate = useNavigate();
  const { user, clearSession } = useSession();
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>('');
  const [actionLog, setActionLog] = useState<string[]>([]);

  const isAdmin = user?.role === 'ADMIN';
  const isDriver = user?.role === 'DRIVER';
  const canQuery = Boolean(user);


  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: canQuery && isAdmin,
  });

  const settingsMutation = useMutation({
    mutationFn: (
      data: UpdateSettingsRequest,
    ) => updateSettings(data),

    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(
        ['settings'],
        updatedSettings,
      );

      queryClient.invalidateQueries({
        queryKey: ['bins'],
      });
    },
  });


  const binsQuery = useQuery({
    queryKey: ['bins', { limit: 100, offset: 0 }],
    queryFn: () => getBins(100, 0),
    enabled: canQuery,
  });


const createGeneratorMutation = useMutation({
  mutationFn: createGenerator,

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['bins'],
    });
  },
});

const updateGeneratorMutation = useMutation({
  mutationFn: ({
    id,
    data,
  }: {
    id: string;
    data: GeneratorPayload;
  }) => updateGenerator(id, data),

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['bins'],
    });
  },
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

  const destinationsQuery = useQuery({
    queryKey: ['destinations'],
    queryFn: getDestinations,
    enabled: canQuery && isAdmin,
  });

  const collectionsQuery = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
    enabled: canQuery && isAdmin,
  });

  const impactQuery = useQuery({
    queryKey: ['collections', 'impact'],
    queryFn: getImpactSummary,
    enabled: canQuery && isAdmin,
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
      addLog(`< [OK] Route generated: ${data[0]?.id?.slice(0, 8) ?? 'unknown'}`);
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
        const firstRouteId = data[0] ? ` | id: ${data[0].id.slice(0, 8)}` : '';
        addLog(
          `< [OK] Predictive result: ${data.length} ${routeLabel}, ${stopCount} ${stopLabel}${firstRouteId}`,
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

  const generateOrganicMutation = useMutation({
    mutationFn: generateOrganicRoutes,
    onSuccess: (data) => {
      addLog(`< [OK] organic route(s) generated: ${data.length}`);
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      queryClient.invalidateQueries({ queryKey: ['bins', 'critical'] });
    },
    onError: (error) => addLog(`< [ERR] ${(error as Error).message}`),
  });

  const createCollectionMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections', 'impact'] });
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      queryClient.invalidateQueries({ queryKey: ['bins', 'critical'] });
    },
  });

  const deliveryMutation = useMutation({
    mutationFn: confirmDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections', 'impact'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeRoute,
    onSuccess: () => {
      addLog('< [OK] Route marked complete');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['bins'] });
    },
    onError: (err) => {
      addLog(`< [ERR] ${(err as Error).message}`);
    },
  });

  const collectBinMutation = useMutation({
    mutationFn: (binId: string) => updateBinFillLevel(binId, 0),
    onSuccess: (_, binId) => {
      addLog(`< [OK] Bin #${binId.slice(0, 6)} emptied to 0%`);
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
      addLog('< [OK] Route cleared');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
    },
    onError: () => {},
  });

  const simulateMutation = useMutation({
    mutationFn: simulateNextDay,
    onSuccess: () => {
      addLog('< [SIMULATION] Advanced +24h: waste increased by 15-25% across network');
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      queryClient.invalidateQueries({ queryKey: ['bins', 'critical'] });
    },
    onError: (err) => {
      addLog(`< [ERR] ${(err as Error).message}`);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetBinsToZero,
    onSuccess: () => {
      addLog('< [RESET] All bins flushed to 0% and active routes cleared');
      queryClient.invalidateQueries({ queryKey: ['bins'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['routes', 'active'] });
    },
    onError: (err) => {
      addLog(`< [ERR] ${(err as Error).message}`);
    },
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
    const vehicleId = assignedVehicleId || operatorAccounts[0]?.id;
    if (!vehicleId) {
      addLog('< [ERR] Select a fleet vehicle first');
      return;
    }
    addLog(`> POST /routes/generate [Vehicle: ${vehicleId.slice(0, 6)}]`);
    generateMutation.mutate({ assignedCarId: vehicleId });
  };

  const runGeneratePredictive = () => {
    const vehicleId = assignedVehicleId || operatorAccounts[0]?.id;
    if (!vehicleId) {
      addLog('< [ERR] Select a fleet vehicle first');
      return;
    }
    addLog(`> POST /routes/generate-predictive [Vehicle: ${vehicleId.slice(0, 6)}]`);
    generatePredictiveMutation.mutate({ assignedCarId: vehicleId });
  };

  const triggerSurge = async () => {
    addLog('> [SIMULATION] Injecting organic waste surge into 4 bins...');
    const candidateBins = bins.slice(0, 4);
    for (const b of candidateBins) {
      await updateBinFillLevel(b.id, Math.floor(Math.random() * 15 + 85));
    }
    queryClient.invalidateQueries({ queryKey: ['bins'] });
    queryClient.invalidateQueries({ queryKey: ['bins', 'critical'] });
    addLog('< [OK] Surge injected: 4 bins escalated to critical fill (≥85%)');
  };

  const runGenerateOrganic = () => {
    if (!assignedVehicleId) {
      addLog('< [ERR] select a vehicle first');
      return;
    }
    addLog('> POST /routes/generate-organic');
    generateOrganicMutation.mutate({ assignedCarId: assignedVehicleId });
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

onCreateGenerator={async (data) => {
  await createGeneratorMutation.mutateAsync(data);
}}

onUpdateGenerator={async (id, data) => {
  await updateGeneratorMutation.mutateAsync({
    id,
    data,
  });
}}

isSavingGenerator={
  createGeneratorMutation.isPending ||
  updateGeneratorMutation.isPending
}

      settings={settingsQuery.data ?? null}
      settingsLoading={settingsQuery.isLoading}
      settingsError={
        settingsQuery.isError
          ? (settingsQuery.error as Error).message
          : null
      }
      onSaveSettings={(data) =>
        settingsMutation.mutateAsync(data).then(() => {})
      }
      isSavingSettings={settingsMutation.isPending}

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
      onGenerateOrganic={runGenerateOrganic}
      onCompleteRoute={(id) => completeMutation.mutate(id)}
      onDeleteRoute={(id) => deleteRouteMutation.mutate(id)}
      onSimulateDay={() => simulateMutation.mutateAsync()}
      onResetBins={() => resetMutation.mutateAsync()}
      onTriggerSurge={triggerSurge}
      onEmptyBin={(binId) => collectBinMutation.mutate(binId)}
      isPendingGenerate={generateMutation.isPending}
      isPendingPredictive={generatePredictiveMutation.isPending}
      isPendingOrganic={generateOrganicMutation.isPending}
      completePending={completeMutation.isPending}
      deletePending={deleteRouteMutation.isPending}
      isPendingSimulate={simulateMutation.isPending}
      isPendingReset={resetMutation.isPending}
      actionLog={actionLog}
      destinations={destinationsQuery.data ?? []}
      collections={collectionsQuery.data ?? []}
      impact={impactQuery.data ?? null}
      operationsError={
        collectionsQuery.isError
          ? (collectionsQuery.error as Error).message
          : impactQuery.isError
            ? (impactQuery.error as Error).message
            : null
      }
      onCreateCollection={(payload: CollectionPayload) =>
        createCollectionMutation.mutateAsync(payload).then(() => {})
      }
      onConfirmDelivery={(id) => deliveryMutation.mutateAsync(id).then(() => {})}
      isSavingCollection={
        createCollectionMutation.isPending || deliveryMutation.isPending
      }
      onLogout={logout}
    />
  );
}

<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditLogService
{
    public function log(string $action, ?string $entityType = null, ?string $entityId = null, array $metadata = [], ?string $userId = null): void
    {
        AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'metadata' => $metadata ?: null,
            'correlation_id' => request()?->headers->get('X-Correlation-ID'),
        ]);
    }
}

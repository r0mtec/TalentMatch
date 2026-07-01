<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesUser;
use App\Http\Requests\StoreRequestFormRequest;
use App\Http\Requests\StoreRequirementFormRequest;
use App\Http\Requests\UpdateRequestFormRequest;
use App\Models\CustomerRequest;
use App\Models\Requirement;
use App\Services\AuditLogService;
use App\Support\RussianValidation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RequestController extends Controller
{
    use ResolvesUser;

    public function __construct(private readonly AuditLogService $auditLog)
    {
    }

    public function index(Request $request)
    {
        $query = CustomerRequest::query()->withCount('requirements')->latest();

        $query->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')));
        $query->when($request->filled('grade'), fn ($q) => $q->where('grade', $request->string('grade')));
        $query->when($request->filled('created_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date('created_from')));
        $query->when($request->filled('created_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date('created_to')));
        $query->when($request->filled('q'), function ($q) use ($request): void {
            $term = '%'.$request->input('q').'%';
            $q->where(function ($nested) use ($term): void {
                $nested->where('title', 'ilike', $term)
                    ->orWhere('position', 'ilike', $term)
                    ->orWhere('project_description', 'ilike', $term);
            });
        });

        return response()->json($query->paginate($request->integer('per_page', 25)));
    }

    public function store(StoreRequestFormRequest $request)
    {
        $customerRequest = CustomerRequest::create($request->validated() + [
            'created_by' => $this->currentUserId(),
            'status' => $request->input('status', 'draft'),
        ]);

        if ($error = $this->activeValidationError($customerRequest)) {
            $customerRequest->delete();

            return $error;
        }

        $this->auditLog->log('request.created', 'request', $customerRequest->id, [], $customerRequest->created_by);

        return response()->json($customerRequest, 201);
    }

    public function show(CustomerRequest $request)
    {
        return response()->json($request->load('requirements.technology'));
    }

    public function update(UpdateRequestFormRequest $httpRequest, CustomerRequest $request)
    {
        $data = $httpRequest->validated();

        if ($error = $this->activeValidationError($request, $data)) {
            return $error;
        }

        $request->update($data);

        $this->auditLog->log('request.updated', 'request', $request->id, [], $this->currentUserId());

        return response()->json($request->refresh());
    }

    public function destroy(CustomerRequest $request)
    {
        $request->update(['status' => 'archived']);

        $this->auditLog->log('request.archived', 'request', $request->id, [], $this->currentUserId());

        return response()->json(['id' => $request->id, 'status' => 'archived']);
    }

    public function storeRequirement(StoreRequirementFormRequest $httpRequest, CustomerRequest $request)
    {
        $data = $httpRequest->validated();
        $data['weight'] ??= $data['type'] === 'must' ? 3 : 1;

        $requirement = $request->requirements()->create($data);

        $this->auditLog->log('requirement.created', 'requirement', $requirement->id, ['request_id' => $request->id], $this->currentUserId());

        return response()->json($requirement->load('technology'), 201);
    }

    public function updateRequirement(Request $request, Requirement $requirement)
    {
        $data = $request->validate([
            'technology_id' => ['sometimes', 'nullable', 'uuid', 'exists:technologies,id'],
            'raw_text' => ['sometimes', 'nullable', 'string'],
            'type' => ['sometimes', 'in:must,nice'],
            'weight' => ['sometimes', 'numeric', 'min:0.01'],
        ], RussianValidation::messages(), RussianValidation::attributes());

        if (($data['technology_id'] ?? $requirement->technology_id) === null && ($data['raw_text'] ?? $requirement->raw_text) === null) {
            return response()->json(['message' => 'Текст требования обязателен, если технология не указана.'], 422);
        }

        $requirement->update($data);

        $this->auditLog->log('requirement.updated', 'requirement', $requirement->id, [], $this->currentUserId());

        return response()->json($requirement->refresh()->load('technology'));
    }

    public function destroyRequirement(Requirement $requirement)
    {
        $id = $requirement->id;
        $requirement->delete();

        $this->auditLog->log('requirement.deleted', 'requirement', $id, [], $this->currentUserId());

        return response()->json(['id' => $id, 'deleted' => true]);
    }

    private function activeValidationError(CustomerRequest $request, array $changes = []): ?JsonResponse
    {
        $status = $changes['status'] ?? $request->status;

        if ($status !== 'active') {
            return null;
        }

        $errors = [];

        foreach (['title', 'position'] as $field) {
            if (blank($changes[$field] ?? $request->{$field})) {
                $errors[$field][] = 'Поле обязательно для активного запроса.';
            }
        }

        if ($request->requirements()->count() === 0) {
            $errors['requirements'][] = 'Для активного запроса нужно добавить хотя бы одно требование.';
        }

        return $errors === [] ? null : response()->json([
            'message' => 'Запрос нельзя перевести в рабочий статус без обязательных данных.',
            'errors' => $errors,
        ], 422);
    }
}

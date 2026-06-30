<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesUser;
use App\Http\Requests\StoreTechnologyRequest;
use App\Http\Requests\StoreTechnologySynonymRequest;
use App\Models\Technology;
use App\Models\TechnologySynonym;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class TechnologyController extends Controller
{
    use ResolvesUser;

    public function __construct(private readonly AuditLogService $auditLog)
    {
    }

    public function index(Request $request)
    {
        $query = Technology::query()->with('synonyms')->orderBy('name');
        $query->when(! $request->boolean('include_inactive'), fn ($q) => $q->where('is_active', true));
        $query->when($request->filled('q'), fn ($q) => $q->where('name', 'ilike', '%'.$request->input('q').'%'));

        return response()->json($query->paginate($request->integer('per_page', 50)));
    }

    public function store(StoreTechnologyRequest $request)
    {
        $technology = Technology::create($request->validated() + ['is_active' => true]);

        $this->auditLog->log('technology.created', 'technology', $technology->id, [], $this->currentUserId());

        return response()->json($technology, 201);
    }

    public function update(Request $request, Technology $technology)
    {
        $technology->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('technologies', 'name')->ignore($technology->id)],
            'group_name' => ['sometimes', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]));

        $this->auditLog->log('technology.updated', 'technology', $technology->id, [], $this->currentUserId());

        return response()->json($technology->refresh()->load('synonyms'));
    }

    public function destroy(Technology $technology)
    {
        $technology->update(['is_active' => false]);

        $this->auditLog->log('technology.disabled', 'technology', $technology->id, [], $this->currentUserId());

        return response()->json(['id' => $technology->id, 'is_active' => false]);
    }

    public function storeSynonym(StoreTechnologySynonymRequest $request, Technology $technology)
    {
        $synonym = $technology->synonyms()->create([
            'synonym' => $request->validated('synonym'),
            'normalized_synonym' => Str::lower($request->validated('synonym')),
        ]);

        $this->auditLog->log('technology_synonym.created', 'technology_synonym', $synonym->id, ['technology_id' => $technology->id], $this->currentUserId());

        return response()->json($synonym, 201);
    }

    public function destroySynonym(TechnologySynonym $synonym)
    {
        $id = $synonym->id;
        $synonym->delete();

        $this->auditLog->log('technology_synonym.deleted', 'technology_synonym', $id, [], $this->currentUserId());

        return response()->json(['id' => $id, 'deleted' => true]);
    }
}

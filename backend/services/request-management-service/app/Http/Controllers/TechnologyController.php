<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesUser;
use App\Http\Requests\StoreTechnologyRequest;
use App\Http\Requests\StoreTechnologySynonymRequest;
use App\Models\Technology;
use App\Models\TechnologySynonym;
use App\Models\UnrecognizedTerm;
use App\Services\AuditLogService;
use App\Support\RussianValidation;
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
            'group_name' => ['sometimes', Rule::in(['languages', 'frameworks', 'databases', 'infrastructure', 'other'])],
            'is_active' => ['sometimes', 'boolean'],
        ], RussianValidation::messages(), RussianValidation::attributes()));

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
        $synonymValue = trim($request->validated('synonym'));
        $synonym = $technology->synonyms()->create([
            'synonym' => $synonymValue,
            'normalized_synonym' => Str::lower($synonymValue),
        ]);

        $this->auditLog->log('technology_synonym.created', 'technology_synonym', $synonym->id, ['technology_id' => $technology->id], $this->currentUserId());

        return response()->json($synonym, 201);
    }

    public function updateSynonym(StoreTechnologySynonymRequest $request, TechnologySynonym $synonym)
    {
        $oldValue = $synonym->synonym;
        $newValue = trim($request->validated('synonym'));

        $synonym->update([
            'synonym' => $newValue,
            'normalized_synonym' => Str::lower($newValue),
        ]);

        $this->auditLog->log('technology_synonym.updated', 'technology_synonym', $synonym->id, [
            'technology_id' => $synonym->technology_id,
            'old_synonym' => $oldValue,
            'new_synonym' => $newValue,
        ], $this->currentUserId());

        return response()->json($synonym->refresh());
    }

    public function destroySynonym(TechnologySynonym $synonym)
    {
        $id = $synonym->id;
        $synonym->delete();

        $this->auditLog->log('technology_synonym.deleted', 'technology_synonym', $id, [], $this->currentUserId());

        return response()->json(['id' => $id, 'deleted' => true]);
    }

    public function unrecognizedTerms(Request $request)
    {
        $query = UnrecognizedTerm::query()->with('candidate')->latest();
        $query->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')));

        return response()->json($query->paginate($request->integer('per_page', 50)));
    }

    public function promoteUnrecognizedTerm(Request $request, UnrecognizedTerm $term)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:technologies,name'],
            'group_name' => ['required', Rule::in(['languages', 'frameworks', 'databases', 'infrastructure', 'other'])],
            'synonyms' => ['nullable', 'array'],
            'synonyms.*' => ['string', 'max:255'],
        ], RussianValidation::messages(), RussianValidation::attributes());

        $technology = Technology::create([
            'name' => $data['name'],
            'group_name' => $data['group_name'],
            'is_active' => true,
        ]);

        foreach (array_unique(array_filter($data['synonyms'] ?? [])) as $synonym) {
            $technology->synonyms()->create([
                'synonym' => $synonym,
                'normalized_synonym' => Str::lower($synonym),
            ]);
        }

        $term->update(['status' => 'processed']);

        $this->auditLog->log('unrecognized_term.promoted', 'unrecognized_term', $term->id, [
            'technology_id' => $technology->id,
        ], $this->currentUserId());
        $this->auditLog->log('technology.created', 'technology', $technology->id, [
            'source_unrecognized_term_id' => $term->id,
        ], $this->currentUserId());

        return response()->json($technology->load('synonyms'), 201);
    }
}

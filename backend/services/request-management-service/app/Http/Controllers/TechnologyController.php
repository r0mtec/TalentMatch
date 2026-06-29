<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TechnologyController extends Controller
{
    public function index()
    {
        return response()->json([
            ['id' => 'tech-php', 'name' => 'PHP', 'group' => 'language', 'is_active' => true],
            ['id' => 'tech-postgresql', 'name' => 'PostgreSQL', 'group' => 'database', 'is_active' => true],
        ]);
    }

    public function store(Request $request)
    {
        return response()->json(['id' => 'technology-created-stub', 'payload' => $request->all()], 201);
    }

    public function update(Request $request, string $technology)
    {
        return response()->json(['id' => $technology, 'updated' => true, 'payload' => $request->all()]);
    }

    public function destroy(string $technology)
    {
        return response()->json(['id' => $technology, 'deleted' => true]);
    }

    public function storeSynonym(Request $request, string $technology)
    {
        return response()->json(['id' => 'synonym-created-stub', 'technology_id' => $technology, 'payload' => $request->all()], 201);
    }

    public function destroySynonym(string $synonym)
    {
        return response()->json(['id' => $synonym, 'deleted' => true]);
    }
}

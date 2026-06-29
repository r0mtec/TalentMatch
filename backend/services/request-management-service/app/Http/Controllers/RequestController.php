<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class RequestController extends Controller
{
    public function index()
    {
        return response()->json([
            ['id' => 'req-demo-1', 'title' => 'Senior PHP / Laravel', 'status' => 'active', 'grade' => 'senior'],
        ]);
    }

    public function store(Request $request)
    {
        return response()->json(['id' => 'req-created-stub', 'status' => 'draft', 'payload' => $request->all()], 201);
    }

    public function show(string $id)
    {
        return response()->json(['id' => $id, 'title' => 'Senior PHP / Laravel', 'requirements' => []]);
    }

    public function update(Request $request, string $id)
    {
        return response()->json(['id' => $id, 'updated' => true, 'payload' => $request->all()]);
    }

    public function destroy(string $id)
    {
        return response()->json(['id' => $id, 'deleted' => true]);
    }

    public function storeRequirement(Request $request, string $requestId)
    {
        return response()->json(['id' => 'requirement-stub', 'request_id' => $requestId, 'payload' => $request->all()], 201);
    }

    public function updateRequirement(Request $request, string $id)
    {
        return response()->json(['id' => $id, 'updated' => true, 'payload' => $request->all()]);
    }

    public function destroyRequirement(string $id)
    {
        return response()->json(['id' => $id, 'deleted' => true]);
    }
}

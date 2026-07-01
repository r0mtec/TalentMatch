<?php

namespace App\Support;

class RussianValidation
{
    public static function messages(): array
    {
        return [
            'array' => 'Поле :attribute должно быть массивом.',
            'between' => [
                'numeric' => 'Поле :attribute должно быть от :min до :max.',
                'file' => 'Размер файла в поле :attribute должен быть от :min до :max КБ.',
                'string' => 'Поле :attribute должно содержать от :min до :max символов.',
                'array' => 'Поле :attribute должно содержать от :min до :max элементов.',
            ],
            'boolean' => 'Поле :attribute должно быть логическим значением.',
            'date' => 'Поле :attribute должно быть корректной датой.',
            'exists' => 'Выбранное значение поля :attribute не найдено.',
            'file' => 'Поле :attribute должно быть файлом.',
            'in' => 'Поле :attribute содержит недопустимое значение.',
            'integer' => 'Поле :attribute должно быть целым числом.',
            'max' => [
                'numeric' => 'Поле :attribute не должно быть больше :max.',
                'file' => 'Размер файла в поле :attribute не должен быть больше :max КБ.',
                'string' => 'Поле :attribute не должно быть длиннее :max символов.',
                'array' => 'Поле :attribute не должно содержать больше :max элементов.',
            ],
            'mimes' => 'Файл в поле :attribute должен быть одного из типов: :values.',
            'min' => [
                'numeric' => 'Поле :attribute должно быть не меньше :min.',
                'file' => 'Размер файла в поле :attribute должен быть не меньше :min КБ.',
                'string' => 'Поле :attribute должно быть не короче :min символов.',
                'array' => 'Поле :attribute должно содержать не меньше :min элементов.',
            ],
            'numeric' => 'Поле :attribute должно быть числом.',
            'required' => 'Поле :attribute обязательно для заполнения.',
            'required_without' => 'Поле :attribute обязательно, если поле :values не заполнено.',
            'string' => 'Поле :attribute должно быть строкой.',
            'unique' => 'Такое значение поля :attribute уже используется.',
            'uuid' => 'Поле :attribute должно быть корректным UUID.',
        ];
    }

    public static function attributes(): array
    {
        return [
            'candidate_id' => 'кандидат',
            'candidate_ids' => 'кандидаты',
            'candidate_ids.*' => 'кандидат',
            'citizenship' => 'гражданство',
            'confidence' => 'уверенность',
            'display_name' => 'имя кандидата',
            'evidence_text' => 'подтверждающий текст',
            'grade' => 'грейд',
            'group_name' => 'группа',
            'is_active' => 'активность',
            'languages' => 'языки',
            'location' => 'локация',
            'login' => 'логин',
            'name' => 'название',
            'normalized_name' => 'нормализованное название',
            'password' => 'пароль',
            'position' => 'позиция',
            'project_description' => 'описание проекта',
            'raw_text' => 'текст требования',
            'request_id' => 'запрос',
            'resume' => 'резюме',
            'role' => 'роль',
            'start_date' => 'дата старта',
            'status' => 'статус',
            'synonym' => 'синоним',
            'technology_id' => 'технология',
            'title' => 'название',
            'type' => 'тип',
            'weight' => 'вес',
            'workload' => 'загрузка',
        ];
    }
}

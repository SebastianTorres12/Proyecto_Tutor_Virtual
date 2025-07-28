<?php
class block_mi_actividad_feedback_block extends block_base {
    public function init() {
        $this->title = get_string('mi_actividad_feedback_block', 'block_mi_actividad_feedback_block');
    }

    public function has_add_block_capability($context) {
        return has_capability('block/mi_actividad_feedback_block:addinstance', $context);
    }

    public function get_content() {
        global $CFG, $COURSE, $USER, $PAGE;

        if ($this->content !== null) {
            return $this->content;
        }

        // Verificar que estamos en una página de actividad (módulo de curso)
        $context = $PAGE->context;
        if ($context->contextlevel !== CONTEXT_MODULE) {
            $this->content = new stdClass();
            $this->content->text = '<p>Este bloque solo funciona en una actividad.</p>';
            $this->content->footer = '';
            return $this->content;
        }

        // Obtener información de la actividad actual
        $cm = $PAGE->cm; // Course module (actividad actual)
        if (!$cm) {
            $this->content = new stdClass();
            $this->content->text = '<p>No se pudo identificar la actividad.</p>';
            $this->content->footer = '';
            return $this->content;
        }

        // Obtener el tipo de actividad (quiz, assign, etc.)
        $modname = $cm->modname;

        // Cargar JavaScript y pasar userId, courseId, cmId y modname
        $this->page->requires->js_call_amd('block_mi_actividad_feedback_block/feedback', 'init', array($USER->id, $COURSE->id, $cm->id, $modname));

        // Contenido del bloque
        $this->content = new stdClass();
        // Agregar botón para solicitar retroalimentación
        $this->content->text = '<div id="feedback-container">';
        $this->content->text .= '<button id="feedback-request-btn" type="button" class="btn btn-primary" style="margin-bottom:10px;">Solicitar retroalimentación del tutor virtual</button>';
        $this->content->text .= '<div id="feedback-messages"></div>';
        $this->content->text .= '</div>';
        return $this->content;
    }

    public function applicable_formats() {
        return array(
            'mod' => true,
            'course-view' => false
        );
    }
}